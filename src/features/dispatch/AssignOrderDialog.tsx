import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button, Modal } from "@/components/ui";
import {
  tmsService,
  type AnyRecord,
  type DispatchOffer,
  type RankedCandidate,
} from "@/services/tms.service";
import type { DataRow } from "@/types/domain";
import { dispatchKeys } from "./dispatch-keys";
import {
  alertLabels,
  dispatchErrorMessage,
  exclusionLabels,
  formatAge,
  formatEta,
  formatMeters,
  offerStatusLabels,
} from "./dispatch-labels";

type Props = {
  order: DataRow | null;
  onClose: () => void;
  onAssigned: () => void;
};

function secondsUntil(iso: string | null, now: number) {
  return iso ? Math.max(0, Math.ceil((new Date(iso).getTime() - now) / 1000)) : 0;
}

/**
 * Asignar una orden desde el TMS usando el mismo ranking H3 + ETA que el
 * despacho automatico: el primero viene preseleccionado (un clic), elegir otro
 * pide motivo, y se ve en vivo la oferta automatica en curso.
 *
 * El padre lo monta con `key` por orden: cada orden empieza con estado limpio.
 */
export function AssignOrderDialog({ order, onClose, onAssigned }: Props) {
  const queryClient = useQueryClient();
  const orderId = order ? String(order._id ?? "") : "";
  const open = Boolean(order && orderId);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [showExcluded, setShowExcluded] = useState(false);
  const [fallbackDriverId, setFallbackDriverId] = useState("");
  const [fallbackVehicleId, setFallbackVehicleId] = useState("");
  const [now, setNow] = useState(() => Date.now());

  const ranking = useQuery({
    queryKey: dispatchKeys.candidates(orderId),
    queryFn: () => tmsService.dispatchCandidates(orderId),
    enabled: open,
    refetchInterval: 20_000,
  });
  const offers = useQuery({
    queryKey: dispatchKeys.offers(orderId),
    queryFn: () => tmsService.dispatchOffers(orderId),
    enabled: open,
  });

  const candidates = useMemo(() => ranking.data?.candidates ?? [], [ranking.data]);
  const top = candidates[0];
  const noRanking = ranking.isSuccess && candidates.length === 0;

  // Sin ranking (sin ubicaciones todavia): lista de respaldo ya filtrada por categoria.
  const fallbackDrivers = useQuery({
    queryKey: ["dispatch", "available-drivers", orderId],
    queryFn: () => tmsService.dispatchAvailableDrivers(orderId),
    enabled: open && noRanking,
  });
  const fallbackVehicles = useQuery({
    queryKey: ["dispatch", "vehicles", fallbackDriverId, order?.vehicleCategoryId],
    queryFn: () =>
      tmsService.vehicles({
        driverId: fallbackDriverId,
        status: "ACTIVE",
        categoryId: String(order?.vehicleCategoryId ?? ""),
      }),
    enabled: open && noRanking && Boolean(fallbackDriverId),
  });

  // El primero del ranking queda elegido hasta que el operador elija otro.
  const effectiveSelectedId = selectedId ?? top?.driverId ?? null;
  // Un solo vehiculo compatible: queda elegido sin tocar nada.
  const fallbackVehicleList = fallbackVehicles.data ?? [];
  const effectiveVehicleId =
    fallbackVehicleId ||
    (fallbackVehicleList.length === 1 ? String(fallbackVehicleList[0].id ?? "") : "");

  const pendingOffer = (offers.data ?? []).find((offer) => offer.status === "PENDING");
  useEffect(() => {
    if (!pendingOffer) return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [pendingOffer]);

  const selected = candidates.find((candidate) => candidate.driverId === effectiveSelectedId) ?? null;
  const needsReason = Boolean(selected && top && selected.driverId !== top.driverId);
  const driverName = (driverId: string) =>
    candidates.find((c) => c.driverId === driverId)?.driverName ??
    ranking.data?.excluded.find((e) => e.driverId === driverId)?.driverName ??
    "Conductor";

  const canSubmit = noRanking
    ? Boolean(fallbackDriverId && effectiveVehicleId)
    : Boolean(selected && (!needsReason || reason.trim().length >= 3));

  const submit = async () => {
    if (!canSubmit || !orderId) return;
    setSaving(true);
    try {
      await tmsService.assignOrder(
        noRanking
          ? { orderId, driverId: fallbackDriverId, vehicleId: effectiveVehicleId, reason: reason.trim() || undefined }
          : {
              orderId,
              driverId: selected!.driverId,
              vehicleId: selected!.vehicleId,
              reason: needsReason ? reason.trim() : undefined,
            },
      );
      toast.success("Orden asignada al conductor");
      await queryClient.invalidateQueries({ queryKey: ["dispatch"] });
      onAssigned();
    } catch (error) {
      toast.error(dispatchErrorMessage(error));
      void ranking.refetch();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title={`Asignar ${order?.id ?? "orden"}`}
      description="Conductores cercanos ordenados por tiempo real de llegada a la recogida."
    >
      <div className="assign-dialog">
        {pendingOffer ? (
          <div className="assign-offer-strip" role="status">
            <strong>
              Oferta automatica a {driverName(pendingOffer.driverId)} · vence en {secondsUntil(pendingOffer.expiresAt, now)} s
            </strong>
            <span>Si asignas manualmente, la oferta se cancela.</span>
          </div>
        ) : null}

        {(ranking.data?.alerts ?? [])
          .filter((alert) => alert !== "NO_CANDIDATES" || !noRanking)
          .map((alert) => (
            <p key={alert} className="assign-alert">
              {alertLabels[alert] ?? alert}
            </p>
          ))}

        {ranking.isLoading ? <p className="assign-muted">Buscando conductores cercanos…</p> : null}
        {ranking.isError ? (
          <p className="assign-alert">{dispatchErrorMessage(ranking.error)}</p>
        ) : null}

        {candidates.length > 0 ? (
          <div className="assign-table" role="radiogroup" aria-label="Candidatos">
            <div className="assign-row assign-row--head">
              <span>#</span>
              <span>Conductor</span>
              <span>Vehiculo</span>
              <span>Llega en</span>
              <span>Distancia</span>
              <span>Posicion</span>
              <span>Puntaje</span>
            </div>
            {candidates.map((candidate: RankedCandidate) => (
              <label
                key={candidate.driverId}
                className={`assign-row ${candidate.driverId === effectiveSelectedId ? "is-selected" : ""}`}
              >
                <span>
                  <input
                    type="radio"
                    name="candidate"
                    checked={candidate.driverId === effectiveSelectedId}
                    onChange={() => setSelectedId(candidate.driverId)}
                  />
                  {candidate.rank}
                </span>
                <span>
                  <strong>{candidate.driverName ?? "Conductor"}</strong>
                  {candidate.rank === 1 ? <em className="assign-badge">Recomendado</em> : null}
                </span>
                <span>{candidate.plateNumber ?? "—"}</span>
                <span>{candidate.etaStatus === "OK" ? formatEta(candidate.etaSeconds) : "Sin ETA"}</span>
                <span>{formatMeters(candidate.roadDistanceMeters ?? candidate.straightLineMeters)}</span>
                <span>{formatAge(candidate.positionAgeSec)}</span>
                <span>{Math.round(candidate.score * 100)}</span>
              </label>
            ))}
          </div>
        ) : null}

        {noRanking ? (
          <div className="form-grid">
            <p className="span-2 assign-muted">
              No hay conductores con ubicacion reciente cerca de la recogida. Elige uno disponible de la categoria de la orden.
            </p>
            <label className="span-2">
              <span>Conductor disponible</span>
              <select
                value={fallbackDriverId}
                onChange={(event) => {
                  setFallbackDriverId(event.target.value);
                  setFallbackVehicleId("");
                }}
              >
                <option value="">Seleccionar conductor</option>
                {(fallbackDrivers.data ?? []).map((driver: AnyRecord) => {
                  const user = (driver.user ?? {}) as AnyRecord;
                  return (
                    <option key={String(driver.id)} value={String(driver.id)}>
                      {String(user.fullName ?? "Conductor")} · {String(driver.licenseNumber ?? "")}
                    </option>
                  );
                })}
              </select>
            </label>
            <label className="span-2">
              <span>Vehiculo activo</span>
              <select
                value={effectiveVehicleId}
                onChange={(event) => setFallbackVehicleId(event.target.value)}
                disabled={!fallbackDriverId || fallbackVehicles.isLoading}
              >
                <option value="">Seleccionar vehiculo</option>
                {(fallbackVehicles.data ?? []).map((vehicle: AnyRecord) => (
                  <option key={String(vehicle.id)} value={String(vehicle.id)}>
                    {String(vehicle.plateNumber ?? "")} · {`${String(vehicle.brand ?? "")} ${String(vehicle.model ?? "")}`.trim()}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : null}

        {needsReason ? (
          <label className="assign-reason">
            <span>Motivo para no elegir al recomendado</span>
            <textarea
              rows={2}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Ej. el cliente pidio a este conductor"
            />
          </label>
        ) : null}

        {(ranking.data?.excluded.length ?? 0) > 0 ? (
          <div className="assign-excluded">
            <button type="button" onClick={() => setShowExcluded((value) => !value)}>
              {showExcluded ? "Ocultar" : "Ver"} excluidos ({ranking.data!.excluded.length})
            </button>
            {showExcluded ? (
              <ul>
                {ranking.data!.excluded.map((row) => (
                  <li key={`${row.driverId}-${row.reason}`}>
                    <strong>{row.driverName ?? "Conductor"}</strong>
                    <span>{exclusionLabels[row.reason] ?? row.reason}</span>
                    {row.positionAgeSec != null ? <small>{formatAge(row.positionAgeSec)}</small> : null}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        {(offers.data ?? []).length > 0 ? (
          <details className="assign-history">
            <summary>Historial de ofertas ({offers.data!.length})</summary>
            <ul>
              {offers.data!.map((offer: DispatchOffer) => (
                <li key={offer.id}>
                  <span>{driverName(offer.driverId)}</span>
                  <span>{offer.mode === "AUTO" ? "Automatica" : "Manual"}</span>
                  <span>{offerStatusLabels[offer.status] ?? offer.status}</span>
                  {offer.reason ? <small>{offer.reason}</small> : null}
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </div>
      <footer className="modal-actions">
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="button" disabled={saving || !canSubmit} onClick={() => void submit()}>
          {saving ? "Asignando..." : selected ? `Asignar a ${selected.driverName ?? "conductor"}` : "Asignar orden"}
        </Button>
      </footer>
    </Modal>
  );
}
