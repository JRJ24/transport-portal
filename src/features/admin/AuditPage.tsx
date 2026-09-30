import { useDeferredValue, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import { PageHeader, StatCard } from "@/components/ui";
import { label, labelField, labelValue } from "@/lib/labels";
import { queryKeys } from "@/lib/query-keys";
import { tmsService, type AnyRecord } from "@/services/tms.service";

/** Entidades que el backend escribe de verdad en la auditoria. */
const ENTITY_OPTIONS = ["ORDER", "CUSTOMER", "DRIVER", "VEHICLE", "RESERVATION", "USER", "UserSession", "DeliveryProof", "SYSTEM_PARAMETER"].map(
  (value) => ({ value, label: label("auditEntity", value) }),
);

const dateTime = new Intl.DateTimeFormat("es-DO", { dateStyle: "medium", timeStyle: "short" });
const formatWhen = (value: unknown) => {
  const date = new Date(String(value ?? ""));
  return Number.isNaN(date.getTime()) ? "—" : dateTime.format(date);
};

interface Change {
  field: string;
  before: string;
  after: string;
}

/** Diferencias entre oldValues y newValues, con nombres y valores en espanol. */
function changesOf(log: AnyRecord): Change[] {
  const before = (log.oldValues && typeof log.oldValues === "object" ? log.oldValues : {}) as AnyRecord;
  const after = (log.newValues && typeof log.newValues === "object" ? log.newValues : {}) as AnyRecord;
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])];
  return keys.map((field) => ({
    field: labelField(field),
    before: field in before ? labelValue(field, before[field]) : "—",
    after: field in after ? labelValue(field, after[field]) : "—",
  }));
}

function actorOf(log: AnyRecord) {
  const user = (log.user ?? null) as AnyRecord | null;
  return String(user?.fullName ?? (log.actorUserId ? "Usuario eliminado" : "Sistema"));
}

function csvCell(value: string) {
  return /[",\n;]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** Trazabilidad de cambios, legible para operaciones (sin codigos crudos). */
export function AuditPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [entityType, setEntityType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const query = useMemo(
    () => ({
      search: deferredSearch,
      entityType,
      from: from ? new Date(`${from}T00:00:00`).toISOString() : undefined,
      to: to ? new Date(`${to}T23:59:59`).toISOString() : undefined,
      limit: 500,
    }),
    [deferredSearch, entityType, from, to],
  );
  const auditQuery = useQuery({
    queryKey: queryKeys.audit(query),
    queryFn: () => tmsService.audit(query),
    refetchInterval: 30000,
  });
  const logs = auditQuery.data ?? [];
  const selected = logs.find((log) => String(log.id) === selectedId) ?? logs[0];
  const changes = selected ? changesOf(selected) : [];

  const exportCsv = () => {
    const header = ["Fecha", "Acción", "Entidad", "Registro", "Usuario", "IP", "Cambios"];
    const lines = logs.map((log) =>
      [
        formatWhen(log.createdAt),
        label("auditAction", log.action),
        label("auditEntity", log.entityType),
        String(log.entityId ?? ""),
        actorOf(log),
        String(log.ipAddress ?? ""),
        changesOf(log)
          .map((change) => `${change.field}: ${change.before} → ${change.after}`)
          .join(" | "),
      ]
        .map(csvCell)
        .join(","),
    );
    const blob = new Blob([`\uFEFF${[header.join(","), ...lines].join("\n")}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `auditoria-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <PageHeader title="Auditoría" subtitle="Quién cambió qué y cuándo" onExport={logs.length ? exportCsv : undefined} />
      {auditQuery.isError && <div className="inline-alert">No se pudo cargar la auditoría.</div>}
      {auditQuery.isLoading && <div className="inline-alert inline-alert--info">Cargando auditoría...</div>}

      <section className="stats-grid">
        <StatCard stat={{ label: "Eventos", value: String(logs.length), helper: "Con el filtro actual", tone: "blue" }} />
        <StatCard stat={{ label: "Usuarios", value: String(new Set(logs.map(actorOf)).size), helper: "Que hicieron cambios", tone: "slate" }} />
        <StatCard
          stat={{
            label: "Inicios fallidos",
            value: String(logs.filter((log) => log.action === "auth.login_failed").length),
            helper: "Intentos de acceso rechazados",
            tone: "red",
          }}
        />
        <StatCard
          stat={{
            label: "Desactivaciones",
            value: String(logs.filter((log) => /SOFT_DELETED/.test(String(log.action))).length),
            helper: "Registros dados de baja",
            tone: "orange",
          }}
        />
      </section>

      <div className="toolbar audit-toolbar">
        <label className="search-field">
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por acción, registro o IP..." />
        </label>
        <div className="filter-row">
          <label className="filter-chip filter-chip--select">
            <span>Entidad</span>
            <select value={entityType} onChange={(event) => setEntityType(event.target.value)}>
              <option value="">Todas</option>
              {ENTITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="filter-chip filter-chip--select">
            <span>Desde</span>
            <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
          </label>
          <label className="filter-chip filter-chip--select">
            <span>Hasta</span>
            <input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
          </label>
        </div>
      </div>

      <section className="audit-layout">
        <article className="panel audit-list">
          <div className="panel-heading">
            <div>
              <h2>Registro de eventos</h2>
              <p>Más recientes primero</p>
            </div>
          </div>
          {!logs.length && !auditQuery.isLoading ? <p className="rate-empty">No hay eventos con este filtro.</p> : null}
          {logs.map((log) => (
            <button className={selected?.id === log.id ? "selected" : ""} key={String(log.id)} onClick={() => setSelectedId(String(log.id))} type="button">
              <time>{formatWhen(log.createdAt)}</time>
              <span>
                <strong>{label("auditAction", log.action)}</strong>
                <small>
                  {actorOf(log)} · {label("auditEntity", log.entityType)}
                </small>
              </span>
              <ChevronRight size={15} />
            </button>
          ))}
        </article>

        <aside className="panel audit-detail">
          {selected ? (
            <>
              <span className="eyebrow">Detalle del evento</span>
              <h3>{label("auditAction", selected.action)}</h3>
              <dl className="audit-facts">
                <div><dt>Fecha</dt><dd>{formatWhen(selected.createdAt)}</dd></div>
                <div><dt>Usuario</dt><dd>{actorOf(selected)}</dd></div>
                <div><dt>Entidad</dt><dd>{label("auditEntity", selected.entityType)}</dd></div>
                <div><dt>Registro</dt><dd className="mono">{String(selected.entityId ?? "—")}</dd></div>
                <div><dt>Dirección IP</dt><dd>{String(selected.ipAddress ?? "—")}</dd></div>
              </dl>
              <h4>Cambios</h4>
              {changes.length ? (
                <table className="audit-diff">
                  <thead>
                    <tr><th>Campo</th><th>Antes</th><th>Después</th></tr>
                  </thead>
                  <tbody>
                    {changes.map((change) => (
                      <tr key={change.field}>
                        <td>{change.field}</td>
                        <td className="is-before">{change.before}</td>
                        <td className="is-after">{change.after}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="rate-empty">Este evento no registra valores cambiados.</p>
              )}
              <details className="audit-json">
                <summary>Ver datos técnicos</summary>
                <pre>{JSON.stringify({ action: selected.action, entityType: selected.entityType, oldValues: selected.oldValues, newValues: selected.newValues, userAgent: selected.userAgent }, null, 2)}</pre>
              </details>
            </>
          ) : (
            <p className="rate-empty">Selecciona un evento para ver el detalle.</p>
          )}
        </aside>
      </section>
    </div>
  );
}
