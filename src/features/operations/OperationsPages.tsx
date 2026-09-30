import { useDeferredValue, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ShieldAlert,
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
import { label, labelOptions } from "@/lib/labels";
import { queryKeys } from "@/lib/query-keys";
import {
  mapIncidentRow,
  mapOrderRow,
  tmsService,
  type AnyRecord,
} from "@/services/tms.service";


export { RatesPage } from "@/features/rates/RatesPage";

const incidentFilters = [
  { label: "Estado", name: "status", options: labelOptions("incidentStatus") },
  { label: "Severidad", name: "severity", options: labelOptions("incidentSeverity") },
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
      ].map((value) => ({ value, label: label("incidentType", value) })),
    },
    {
      name: "severity",
      label: "Severidad",
      type: "select" as const,
      options: labelOptions("incidentSeverity"),
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

  const escalate = async () => {
    if (!selected) return;
    try {
      await tmsService.escalateIncident(String(selected.id), comment.trim() || undefined);
      setComment("");
      await queryClient.invalidateQueries({ queryKey: ["incidents"] });
      toast.success("Incidencia escalada: subió la severidad y se avisó a operaciones");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo escalar");
    }
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
            value: String(count(rows, "OPEN", "estadoInterno")),
            helper: "Requieren atención",
            tone: "orange",
          }}
        />
        <StatCard
          stat={{
            label: "Críticas",
            value: String(count(rows, "CRITICAL", "severidadInterna")),
            helper: "Atención inmediata",
            tone: "red",
          }}
        />
        <StatCard
          stat={{
            label: "En revisión",
            value: String(count(rows, "IN_REVIEW", "estadoInterno")),
            helper: "Operador asignado",
            tone: "slate",
          }}
        />
        <StatCard
          stat={{
            label: "Resueltas",
            value: String(count(rows, "RESOLVED", "estadoInterno")),
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
              disabled={!selected}
              onClick={() => void escalate()}
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


export { EvidencePage } from "@/features/evidence/EvidencePage";

function count(
  rows: Array<Record<string, string | number>>,
  value: string,
  field = "estado",
) {
  return rows.filter((row) => String(row[field]) === value).length;
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
