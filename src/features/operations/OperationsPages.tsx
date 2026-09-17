import { useDeferredValue, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Camera,
  CheckCircle2,
  FileSignature,
  MapPin,
  ShieldAlert,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import {
  Button,
  EntityForm,
  Modal,
  PageHeader,
  SearchFilters,
  StatCard,
  StatusBadge,
} from "@/components/ui";
import { queryKeys } from "@/lib/query-keys";
import {
  mapDeliveryProofRow,
  mapIncidentRow,
  mapOrderRow,
  mapRateCardRow,
  mapRateRuleRow,
  tmsService,
  type AnyRecord,
} from "@/services/tms.service";
import { formatMoney } from "@/lib/money";

const activeFilter = [
  {
    label: "Estado",
    name: "isActive",
    options: [
      { label: "ACTIVE", value: "true" },
      { label: "INACTIVE", value: "false" },
    ],
  },
];

export function RatesPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const query = useMemo(
    () => ({ search: deferredSearch, ...filters }),
    [deferredSearch, filters],
  );
  const cardsQuery = useQuery({
    queryKey: queryKeys.rates(query),
    queryFn: () => tmsService.rateCards(query),
  });
  const categoriesQuery = useQuery({
    queryKey: ["lookup", "vehicle-categories", "rates"],
    queryFn: () => tmsService.vehicleCategories(),
    staleTime: 10 * 60_000,
  });
  const cards = cardsQuery.data ?? [];
  const categories = categoriesQuery.data ?? [];
  const rows = cards.map(mapRateCardRow);
  const activeCards = rows.filter((row) => row.estado === "ACTIVE").length;
  const rules = cards.flatMap((card) =>
    recordArray(card.rateRules).map((rule) => ({
      card,
      row: mapRateRuleRow(rule, categories),
    })),
  );
  const selected = rows[0];
  const fields = [
    { name: "name", label: "Nombre de tarifa" },
    { name: "description", label: "Descripción", type: "textarea" as const },
    { name: "validFrom", label: "Válida desde", type: "date" as const },
    {
      name: "validTo",
      label: "Válida hasta",
      type: "date" as const,
      required: false,
    },
    {
      name: "isActive",
      label: "Activa",
      type: "select" as const,
      options: ["true", "false"],
      required: false,
    },
  ];

  const save = async (values: Record<string, string>) => {
    try {
      await tmsService.createRateCard(values);
      await queryClient.invalidateQueries({ queryKey: ["rates"] });
      toast.success("Tarifa creada en transport-api");
      setOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo crear la tarifa",
      );
    }
  };

  return (
    <div>
      <PageHeader
        title="Tarifas"
        subtitle="Reglas de precio por zona, vehículo y horario"
        action="Crear tarifa"
        onAction={() => setOpen(true)}
      />
      {(cardsQuery.isError || categoriesQuery.isError) && (
        <div className="inline-alert">
          No se pudieron cargar tarifas o categorías desde la API.
        </div>
      )}
      {(cardsQuery.isLoading || categoriesQuery.isLoading) && (
        <div className="inline-alert inline-alert--info">
          Sincronizando tarifas...
        </div>
      )}
      <section className="stats-grid">
        <StatCard
          stat={{
            label: "Tarifas",
            value: String(rows.length),
            helper: "Rate cards",
            tone: "blue",
          }}
        />
        <StatCard
          stat={{
            label: "Activas",
            value: String(activeCards),
            helper: "Disponibles para cotizar",
            tone: "green",
          }}
        />
        <StatCard
          stat={{
            label: "Reglas",
            value: String(rules.length),
            helper: "Por categoría",
            tone: "orange",
          }}
        />
        <StatCard
          stat={{
            label: "Cambios",
            value: String(rows.length),
            helper: "Auditables por API",
            tone: "slate",
          }}
        />
      </section>
      <SearchFilters
        search={search}
        onSearch={setSearch}
        filters={activeFilter}
        values={filters}
        onFilterChange={(name, value) =>
          setFilters((current) => ({ ...current, [name]: value }))
        }
      />
      <section className="rate-layout">
        <article className="panel">
          <div className="panel-heading">
            <div>
              <h2>Matriz de tarifas</h2>
              <p>Rate cards y reglas vigentes</p>
            </div>
            <div className="segmented">
              <button className="active">Reglas</button>
            </div>
          </div>
          <div className="rate-table">
            <div className="rate-row rate-head">
              <span>Tarifa</span>
              <span>Vigencia</span>
              <span>Reglas</span>
              <span>Estado</span>
            </div>
            {rows.map((row) => (
              <button className="rate-row" key={row.id}>
                <strong>{row.nombre}</strong>
                <span>{row.vigencia}</span>
                <span>{row.reglas}</span>
                <StatusBadge>{row.estado}</StatusBadge>
              </button>
            ))}
          </div>
        </article>
        <aside className="dark-insight">
          <span>Tarifa seleccionada</span>
          <h3>{String(selected?.nombre ?? "Sin tarifa")}</h3>
          <p>
            {String(
              selected?.descripcion ??
                "No hay rate card seleccionado o el filtro no devolvió resultados.",
            )}
          </p>
          {rules.slice(0, 3).map(({ row }) => (
            <div key={row.id}>
              <span>{row.vehiculo}</span>
              <strong>
                {formatMoney(row.base as number | string | null)} · {row.km}/km ·{" "}
                {row.minuto}/min
              </strong>
            </div>
          ))}
          <StatusBadge>{String(selected?.estado ?? "SIN DATOS")}</StatusBadge>
        </aside>
      </section>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Crear tarifa"
        description="Define el rate card base. Las reglas se agregan al rate card desde pricing/rules."
        wide
      >
        <EntityForm
          fields={fields}
          onCancel={() => setOpen(false)}
          onSubmit={save}
          submitLabel="Crear tarifa"
        />
      </Modal>
    </div>
  );
}

const incidentFilters = [
  {
    label: "Estado",
    name: "status",
    options: ["OPEN", "IN_REVIEW", "RESOLVED", "CLOSED"].map((value) => ({
      label: value,
      value,
    })),
  },
  {
    label: "Severidad",
    name: "severity",
    options: ["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((value) => ({
      label: value,
      value,
    })),
  },
];

export function IncidentsPage() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const query = useMemo(
    () => ({ search: deferredSearch, ...filters }),
    [deferredSearch, filters],
  );
  const incidentsQuery = useQuery({
    queryKey: queryKeys.incidents(query),
    queryFn: () => tmsService.incidents(query),
    refetchInterval: 30000,
  });
  const ordersQuery = useQuery({
    queryKey: ["lookup", "orders", "incidents"],
    queryFn: () => tmsService.orders(),
    enabled: open,
  });
  const incidents = incidentsQuery.data ?? [];
  const rows = incidents.map(mapIncidentRow);
  const selected = rows.find((row) => row.id === selectedId) ?? rows[0];
  const fields = [
    {
      name: "orderId",
      label: "Orden",
      type: "select" as const,
      options: orderOptions(ordersQuery.data ?? []),
    },
    {
      name: "incidentType",
      label: "Tipo",
      type: "select" as const,
      options: [
        "DELAY",
        "DAMAGE",
        "CUSTOMER_ABSENT",
        "WRONG_ADDRESS",
        "VEHICLE_PROBLEM",
        "OTHER",
      ],
    },
    {
      name: "severity",
      label: "Severidad",
      type: "select" as const,
      options: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
    },
    { name: "title", label: "Título" },
    { name: "description", label: "Descripción", type: "textarea" as const },
    { name: "latitude", label: "Latitud", type: "number" as const },
    { name: "longitude", label: "Longitud", type: "number" as const },
  ];

  const save = async (values: Record<string, string>) => {
    try {
      await tmsService.createIncident(values);
      await queryClient.invalidateQueries({ queryKey: ["incidents"] });
      toast.success("Incidencia reportada en transport-api");
      setOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo reportar la incidencia",
      );
    }
  };

  const resolve = async () => {
    if (!selected) return;
    await tmsService.updateIncidentStatus(String(selected.id), "RESOLVED");
    await queryClient.invalidateQueries({ queryKey: ["incidents"] });
    toast.success("Incidencia resuelta");
  };

  const addComment = async () => {
    if (!selected || !comment.trim()) return;
    await tmsService.addIncidentComment(String(selected.id), comment);
    setComment("");
    await queryClient.invalidateQueries({ queryKey: ["incidents"] });
    toast.success("Comentario agregado");
  };

  return (
    <div>
      <PageHeader
        title="Incidencias"
        subtitle="Clasificación, SLA y resolución operativa"
        action="Reportar incidencia"
        onAction={() => setOpen(true)}
      />
      {incidentsQuery.isError && (
        <div className="inline-alert">
          No se pudieron cargar incidencias desde la API.
        </div>
      )}
      {incidentsQuery.isLoading && (
        <div className="inline-alert inline-alert--info">
          Sincronizando incidencias...
        </div>
      )}
      <section className="stats-grid">
        <StatCard
          stat={{
            label: "Abiertas",
            value: String(count(rows, "OPEN")),
            helper: "Requieren atención",
            tone: "orange",
          }}
        />
        <StatCard
          stat={{
            label: "Críticas",
            value: String(count(rows, "CRITICAL", "severidad")),
            helper: "Atención inmediata",
            tone: "red",
          }}
        />
        <StatCard
          stat={{
            label: "En revisión",
            value: String(count(rows, "IN_REVIEW")),
            helper: "Operador asignado",
            tone: "slate",
          }}
        />
        <StatCard
          stat={{
            label: "Resueltas",
            value: String(count(rows, "RESOLVED")),
            helper: "Histórico filtrado",
            tone: "green",
          }}
        />
      </section>
      <SearchFilters
        search={search}
        onSearch={setSearch}
        filters={incidentFilters}
        values={filters}
        onFilterChange={(name, value) =>
          setFilters((current) => ({ ...current, [name]: value }))
        }
      />
      <section className="incident-layout">
        <article className="panel incident-queue">
          <div className="panel-heading">
            <div>
              <h2>Cola priorizada</h2>
              <p>Ordenada por severidad y API filters</p>
            </div>
          </div>
          {rows.map((incident) => (
            <button
              className={selected?.id === incident.id ? "selected" : ""}
              key={incident.id}
              onClick={() => setSelectedId(String(incident.id))}
            >
              <ShieldAlert size={18} />
              <span>
                <strong>{incident.orden}</strong>
                <small>
                  {incident.titulo} · {incident.tipo}
                </small>
              </span>
              <em>{incident.fecha}</em>
              <StatusBadge>{incident.severidad}</StatusBadge>
            </button>
          ))}
        </article>
        <article className="panel incident-detail">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Detalle</span>
              <h2>{String(selected?.orden ?? "Sin selección")}</h2>
            </div>
            <StatusBadge>{String(selected?.estado ?? "SIN DATOS")}</StatusBadge>
          </div>
          <h3>{String(selected?.titulo ?? "Selecciona una incidencia")}</h3>
          <p>
            Tipo: {String(selected?.tipo ?? "--")}
            <br />
            Severidad: {String(selected?.severidad ?? "--")}
            <br />
            Reportada: {String(selected?.fecha ?? "--")}
          </p>
          <textarea
            placeholder="Agregar comentario interno..."
            value={comment}
            onChange={(event) => setComment(event.target.value)}
          />
          <div className="incident-actions">
            <Button variant="secondary" onClick={addComment}>
              Comentar
            </Button>
            <Button
              variant="danger"
              onClick={() =>
                toast.info("Escalamiento pendiente de endpoint dedicado")
              }
            >
              Escalar
            </Button>
            <Button onClick={resolve}>Resolver</Button>
          </div>
        </article>
      </section>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Reportar incidencia"
        description="Registra severidad, ubicación y responsable."
        wide
      >
        <EntityForm
          fields={fields}
          onCancel={() => setOpen(false)}
          onSubmit={save}
        />
      </Modal>
    </div>
  );
}

const evidenceFilters = [
  {
    label: "Estado",
    name: "validationStatus",
    options: ["PENDING", "VALIDATED", "REJECTED"].map((value) => ({
      label: value,
      value,
    })),
  },
  {
    label: "Tipo",
    name: "proofType",
    options: ["PHOTO", "SIGNATURE", "QR", "CODE", "MIXED"].map((value) => ({
      label: value,
      value,
    })),
  },
];

export function EvidencePage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const query = useMemo(
    () => ({ search: deferredSearch, ...filters }),
    [deferredSearch, filters],
  );
  const proofsQuery = useQuery({
    queryKey: queryKeys.evidence(query),
    queryFn: () => tmsService.deliveryProofs(query),
    refetchInterval: 30000,
  });
  const ordersQuery = useQuery({
    queryKey: ["lookup", "orders", "evidence"],
    queryFn: () => tmsService.orders(),
    enabled: open,
  });
  const rows = (proofsQuery.data ?? []).map(mapDeliveryProofRow);
  const fields = [
    {
      name: "orderId",
      label: "Orden",
      type: "select" as const,
      options: orderOptions(ordersQuery.data ?? []),
    },
    {
      name: "proofType",
      label: "Tipo",
      type: "select" as const,
      options: ["PHOTO", "SIGNATURE", "QR", "CODE", "MIXED"],
    },
    { name: "recipientName", label: "Nombre del receptor" },
    { name: "recipientDocument", label: "Documento del receptor" },
    { name: "latitude", label: "Latitud", type: "number" as const },
    { name: "longitude", label: "Longitud", type: "number" as const },
    {
      name: "notes",
      label: "Comentario",
      type: "textarea" as const,
      required: false,
    },
  ];

  const save = async (values: Record<string, string>) => {
    try {
      await tmsService.createDeliveryProof(values);
      await queryClient.invalidateQueries({ queryKey: ["evidence"] });
      toast.success("Evidencia registrada en transport-api");
      setOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo registrar la evidencia",
      );
    }
  };

  const validate = async (id: string, validationStatus: string) => {
    await tmsService.validateDeliveryProof(id, validationStatus);
    await queryClient.invalidateQueries({ queryKey: ["evidence"] });
    toast.success(`Evidencia ${validationStatus.toLowerCase()}`);
  };

  return (
    <div>
      <PageHeader
        title="Evidencias"
        subtitle="Fotos, firmas y coordenadas de entrega"
        action="Subir evidencia"
        onAction={() => setOpen(true)}
      />
      {proofsQuery.isError && (
        <div className="inline-alert">
          No se pudieron cargar evidencias desde la API.
        </div>
      )}
      {proofsQuery.isLoading && (
        <div className="inline-alert inline-alert--info">
          Sincronizando evidencias...
        </div>
      )}
      <section className="stats-grid">
        <StatCard
          stat={{
            label: "Por revisar",
            value: String(count(rows, "PENDING")),
            helper: "Validación pendiente",
            tone: "orange",
          }}
        />
        <StatCard
          stat={{
            label: "Aprobadas",
            value: String(count(rows, "VALIDATED")),
            helper: "Datos API",
            tone: "green",
          }}
        />
        <StatCard
          stat={{
            label: "Rechazadas",
            value: String(count(rows, "REJECTED")),
            helper: "Requieren corrección",
            tone: "red",
          }}
        />
        <StatCard
          stat={{
            label: "Total",
            value: String(rows.length),
            helper: "Filtro actual",
            tone: "slate",
          }}
        />
      </section>
      <SearchFilters
        search={search}
        onSearch={setSearch}
        filters={evidenceFilters}
        values={filters}
        onFilterChange={(name, value) =>
          setFilters((current) => ({ ...current, [name]: value }))
        }
      />
      <section className="panel evidence-board">
        <div className="panel-heading">
          <div>
            <h2>Bandeja de revisión</h2>
            <p>Validación visual y automática</p>
          </div>
          <div className="segmented">
            <button className="active">Galería</button>
          </div>
        </div>
        <div className="proof-grid">
          {rows.map((proof) => {
            const Icon = proof.tipo === "SIGNATURE" ? FileSignature : Camera;
            return (
              <button
                key={String(proof.id)}
                onDoubleClick={() => validate(String(proof.id), "VALIDATED")}
              >
                <div className="proof-preview">
                  <Icon size={30} />
                  <span className="gps-chip">
                    <MapPin size={12} /> GPS
                  </span>
                </div>
                <span>
                  <strong>{String(proof.orden)}</strong>
                  <small>
                    {String(proof.receptor)} · {String(proof.tipo)}
                  </small>
                </span>
                <StatusBadge>{String(proof.estado)}</StatusBadge>
              </button>
            );
          })}
        </div>
      </section>
      <section className="validation-banner">
        <CheckCircle2 size={24} />
        <div>
          <strong>Validación automática activa</strong>
          <p>
            Coordenadas, hora de entrega, firma y foto se cruzan contra la orden
            antes de facturar.
          </p>
        </div>
        <span>
          {rows.length
            ? `${Math.round((count(rows, "VALIDATED") / rows.length) * 100)}%`
            : "0%"}{" "}
          validado
        </span>
      </section>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Subir evidencias"
        description="Registra metadata, firma y ubicación de entrega."
        wide
      >
        <div className="upload-zone">
          <Upload size={24} />
          <strong>Adjuntos vía /attachments</strong>
          <span>
            Este formulario registra delivery-proof; archivos se vinculan como
            attachments.
          </span>
        </div>
        <EntityForm
          fields={fields}
          onCancel={() => setOpen(false)}
          onSubmit={save}
        />
      </Modal>
    </div>
  );
}

function count(
  rows: Array<Record<string, string | number>>,
  value: string,
  field = "estado",
) {
  return rows.filter((row) => String(row[field]) === value).length;
}

function recordArray(value: unknown): AnyRecord[] {
  return Array.isArray(value)
    ? value.filter((item): item is AnyRecord =>
        Boolean(item && typeof item === "object" && !Array.isArray(item)),
      )
    : [];
}

function orderOptions(orders: AnyRecord[]) {
  return orders.map((order) => {
    const row = mapOrderRow(order);
    return {
      label: `${row.id} · ${row.cliente} · ${row.origen} → ${row.destino}`,
      value: String(row._id ?? row.id),
    };
  });
}
