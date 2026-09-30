import { useDeferredValue, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, FileSignature, MapPin, X } from "lucide-react";
import { toast } from "sonner";
import { Button, Modal, PageHeader, SearchFilters, StatCard, StatusBadge } from "@/components/ui";
import { label, labelOptions } from "@/lib/labels";
import { queryKeys } from "@/lib/query-keys";
import { tmsService, type AnyRecord } from "@/services/tms.service";

const filters = [
  { label: "Estado", name: "validationStatus", options: labelOptions("validationStatus") },
  { label: "Tipo", name: "proofType", options: labelOptions("proofType") },
];

interface ProofFile {
  id: string;
  url: string;
  isImage: boolean;
  name: string;
}

interface Proof {
  id: string;
  orderCode: string;
  recipientName: string;
  recipientDocument: string;
  proofType: string;
  status: string;
  notes: string;
  capturedAt: string;
  driverName: string;
  latitude: number | null;
  longitude: number | null;
  destinationAddress: string;
  destinationLat: number | null;
  destinationLng: number | null;
  photos: ProofFile[];
  signatures: ProofFile[];
}

const asArray = (value: unknown): AnyRecord[] =>
  Array.isArray(value) ? value.filter((item): item is AnyRecord => Boolean(item && typeof item === "object")) : [];
const toNumber = (value: unknown) => {
  const number = Number(value);
  return value === null || value === undefined || value === "" || !Number.isFinite(number) ? null : number;
};

function toProof(raw: AnyRecord): Proof {
  const order = (raw.order ?? {}) as AnyRecord;
  const destination = asArray(order.orderStops)[0] ?? {};
  const driver = (raw.driver ?? {}) as AnyRecord;
  return {
    id: String(raw.id),
    orderCode: String(order.orderCode ?? raw.orderId ?? "—"),
    recipientName: String(raw.recipientName ?? "—"),
    recipientDocument: String(raw.recipientDocument ?? "—"),
    proofType: String(raw.proofType ?? ""),
    status: String(raw.validationStatus ?? "PENDING"),
    notes: String(raw.notes ?? ""),
    capturedAt: String(raw.capturedAt ?? ""),
    driverName: String(driver.fullName ?? "—"),
    latitude: toNumber(raw.latitude),
    longitude: toNumber(raw.longitude),
    destinationAddress: String(destination.addressLine ?? "—"),
    destinationLat: toNumber(destination.latitude),
    destinationLng: toNumber(destination.longitude),
    photos: asArray(raw.attachments).map((file) => ({
      id: String(file.id),
      url: String(file.fileUrl ?? ""),
      isImage: String(file.mimeType ?? "").startsWith("image/"),
      name: String(file.fileName ?? "archivo"),
    })),
    signatures: asArray(raw.signatures).map((signature) => ({
      id: String(signature.id),
      url: String(signature.signatureUrl ?? ""),
      isImage: true,
      name: `Firma de ${String(signature.signerName ?? "receptor")}`,
    })),
  };
}

/** Metros entre el punto de la evidencia y la direccion de entrega. */
function distanceMeters(proof: Proof): number | null {
  if (proof.latitude == null || proof.longitude == null || proof.destinationLat == null || proof.destinationLng == null) return null;
  const rad = (value: number) => (value * Math.PI) / 180;
  const dLat = rad(proof.destinationLat - proof.latitude);
  const dLng = rad(proof.destinationLng - proof.longitude);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(proof.latitude)) * Math.cos(rad(proof.destinationLat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * 6_371_000 * Math.asin(Math.min(1, Math.sqrt(a))));
}

const dateFormat = new Intl.DateTimeFormat("es-DO", { dateStyle: "medium", timeStyle: "short" });
const formatDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : dateFormat.format(date);
};

/** Revision de evidencias de entrega: fotos, firma y ubicacion contra el destino. */
export function EvidencePage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [values, setValues] = useState<Record<string, string>>({});
  const [openId, setOpenId] = useState<string | null>(null);
  const query = useMemo(() => ({ search: deferredSearch, ...values }), [deferredSearch, values]);

  const proofsQuery = useQuery({
    queryKey: queryKeys.evidence(query),
    queryFn: () => tmsService.deliveryProofs(query),
    refetchInterval: 30000,
  });
  const proofs = (proofsQuery.data ?? []).map(toProof);
  const open = proofs.find((proof) => proof.id === openId) ?? null;
  const count = (status: string) => proofs.filter((proof) => proof.status === status).length;

  return (
    <div>
      <PageHeader title="Evidencias" subtitle="Fotos, firmas y ubicación de cada entrega. Revisa y aprueba o rechaza." />
      {proofsQuery.isError && <div className="inline-alert">No se pudieron cargar las evidencias.</div>}
      {proofsQuery.isLoading && <div className="inline-alert inline-alert--info">Cargando evidencias...</div>}
      <section className="stats-grid">
        <StatCard stat={{ label: "Por revisar", value: String(count("PENDING")), helper: "Esperando aprobación", tone: "orange" }} />
        <StatCard stat={{ label: "Aprobadas", value: String(count("VALIDATED")), helper: "Listas para facturar", tone: "green" }} />
        <StatCard stat={{ label: "Rechazadas", value: String(count("REJECTED")), helper: "Requieren corrección", tone: "red" }} />
        <StatCard stat={{ label: "Total", value: String(proofs.length), helper: "Con el filtro actual", tone: "slate" }} />
      </section>
      <SearchFilters
        search={search}
        onSearch={setSearch}
        filters={filters}
        values={values}
        onFilterChange={(name, value) => setValues((current) => ({ ...current, [name]: value }))}
      />
      <section className="panel evidence-board">
        <div className="panel-heading">
          <div>
            <h2>Bandeja de revisión</h2>
            <p>Toca una evidencia para ver fotos, firma y ubicación</p>
          </div>
        </div>
        {!proofs.length && !proofsQuery.isLoading ? <p className="rate-empty">No hay evidencias con este filtro.</p> : null}
        <div className="proof-grid">
          {proofs.map((proof) => {
            const cover = proof.photos.find((file) => file.isImage) ?? proof.signatures[0];
            const Icon = proof.proofType === "SIGNATURE" ? FileSignature : Camera;
            const distance = distanceMeters(proof);
            return (
              <button key={proof.id} type="button" onClick={() => setOpenId(proof.id)}>
                <div className="proof-preview">
                  {cover?.url ? <img src={cover.url} alt={`Evidencia de ${proof.orderCode}`} loading="lazy" /> : <Icon size={30} />}
                  {proof.photos.length + proof.signatures.length > 1 ? (
                    <span className="proof-count">+{proof.photos.length + proof.signatures.length - 1}</span>
                  ) : null}
                  {distance != null ? (
                    <span className={`gps-chip ${distance > 300 ? "is-far" : ""}`}>
                      <MapPin size={12} /> {distance < 1000 ? `${distance} m` : `${(distance / 1000).toFixed(1)} km`}
                    </span>
                  ) : null}
                </div>
                <span>
                  <strong>{proof.orderCode}</strong>
                  <small>
                    {proof.recipientName} · {label("proofType", proof.proofType)}
                  </small>
                </span>
                <StatusBadge>{label("validationStatus", proof.status)}</StatusBadge>
              </button>
            );
          })}
        </div>
      </section>

      {open ? (
        <ProofDetail
          key={open.id}
          proof={open}
          onClose={() => setOpenId(null)}
          onReviewed={async () => {
            await queryClient.invalidateQueries({ queryKey: ["evidence"] });
          }}
        />
      ) : null}
    </div>
  );
}

function ProofDetail({ proof, onClose, onReviewed }: { proof: Proof; onClose: () => void; onReviewed: () => Promise<void> }) {
  const [viewer, setViewer] = useState<ProofFile | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const distance = distanceMeters(proof);
  const files = [...proof.photos, ...proof.signatures];

  const review = async (status: "VALIDATED" | "REJECTED") => {
    if (status === "REJECTED" && reason.trim().length < 3) {
      toast.error("Indica el motivo del rechazo");
      return;
    }
    setSaving(true);
    try {
      await tmsService.validateDeliveryProof(proof.id, status, status === "REJECTED" ? reason.trim() : undefined);
      await onReviewed();
      toast.success(status === "VALIDATED" ? "Evidencia aprobada" : "Evidencia rechazada");
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar la revisión");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={`Evidencia · ${proof.orderCode}`} description={`${label("proofType", proof.proofType)} · ${formatDate(proof.capturedAt)}`} wide>
      <div className="proof-detail">
        {files.length ? (
          <div className="proof-gallery">
            {files.map((file) => (
              <button key={file.id} type="button" onClick={() => file.isImage && setViewer(file)}>
                {file.isImage && file.url ? <img src={file.url} alt={file.name} /> : <a href={file.url} target="_blank" rel="noreferrer">{file.name}</a>}
              </button>
            ))}
          </div>
        ) : (
          <p className="inline-alert">Esta evidencia no tiene fotos ni firma adjuntas.</p>
        )}

        <dl className="proof-facts">
          <div><dt>Estado</dt><dd><StatusBadge>{label("validationStatus", proof.status)}</StatusBadge></dd></div>
          <div><dt>Recibió</dt><dd>{proof.recipientName}</dd></div>
          <div><dt>Documento</dt><dd>{proof.recipientDocument}</dd></div>
          <div><dt>Conductor</dt><dd>{proof.driverName}</dd></div>
          <div><dt>Destino de la orden</dt><dd>{proof.destinationAddress}</dd></div>
          <div>
            <dt>Distancia al destino</dt>
            <dd className={distance != null && distance > 300 ? "is-warning" : ""}>
              {distance == null ? "Sin coordenadas" : distance < 1000 ? `${distance} m` : `${(distance / 1000).toFixed(1)} km`}
              {distance != null && distance > 300 ? " · revisar" : ""}
            </dd>
          </div>
          {proof.latitude != null && proof.longitude != null ? (
            <div>
              <dt>Ubicación</dt>
              <dd>
                <a href={`https://www.google.com/maps?q=${proof.latitude},${proof.longitude}`} target="_blank" rel="noreferrer">
                  Ver en Google Maps
                </a>
              </dd>
            </div>
          ) : null}
          {proof.notes ? <div className="span-2"><dt>Notas</dt><dd className="proof-notes">{proof.notes}</dd></div> : null}
        </dl>

        {rejecting ? (
          <label className="assign-reason">
            <span>Motivo del rechazo (se guarda en la evidencia)</span>
            <textarea rows={2} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Ej. la foto no muestra el paquete entregado" />
          </label>
        ) : null}
      </div>
      <footer className="modal-actions">
        <Button type="button" variant="secondary" onClick={onClose}>Cerrar</Button>
        {rejecting ? (
          <>
            <Button type="button" variant="secondary" onClick={() => setRejecting(false)} disabled={saving}>Volver</Button>
            <Button type="button" variant="danger" onClick={() => void review("REJECTED")} disabled={saving}>Confirmar rechazo</Button>
          </>
        ) : (
          <>
            {proof.status !== "REJECTED" ? <Button type="button" variant="danger" onClick={() => setRejecting(true)} disabled={saving}>Rechazar</Button> : null}
            {proof.status !== "VALIDATED" ? <Button type="button" onClick={() => void review("VALIDATED")} disabled={saving}>{saving ? "Guardando..." : "Aprobar"}</Button> : null}
          </>
        )}
      </footer>

      {viewer ? (
        <div className="proof-lightbox" role="dialog" aria-label={viewer.name} onClick={() => setViewer(null)}>
          <button type="button" aria-label="Cerrar" onClick={() => setViewer(null)}><X size={22} /></button>
          <img src={viewer.url} alt={viewer.name} />
        </div>
      ) : null}
    </Modal>
  );
}
