import { useDeferredValue, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, Bell, ChevronRight, Cloud, Download, KeyRound, Map, PlugZap, ShieldCheck, Users } from "lucide-react";
import { toast } from "sonner";
import { Button, DataTable, EntityForm, Modal, PageHeader, SearchFilters, StatCard, StatusBadge } from "@/components/ui";
import { queryKeys } from "@/lib/query-keys";
import { mapAuditRow, mapCatalogRow, mapParameterRow, mapUserRow, tmsService, type AnyRecord, type ReportFormat } from "@/services/tms.service";

const exportButtons: Array<{ label: string; type: "operations" | "billing"; format: ReportFormat }> = [
  { label: "Operaciones CSV", type: "operations", format: "csv" },
  { label: "Operaciones Excel", type: "operations", format: "xlsx" },
  { label: "Operaciones PDF", type: "operations", format: "pdf" },
  { label: "Facturación CSV", type: "billing", format: "csv" },
  { label: "Facturación Excel", type: "billing", format: "xlsx" },
  { label: "Facturación PDF", type: "billing", format: "pdf" },
];

export function ReportsPage() {
  const [range, setRange] = useState<"7" | "30">("7");
  const query = useMemo(() => ({ from: daysAgo(Number(range)) }), [range]);
  const operationsQuery = useQuery({ queryKey: queryKeys.reports("operations", query), queryFn: () => tmsService.reportsOperations(query) });
  const billingQuery = useQuery({ queryKey: queryKeys.reports("billing", query), queryFn: () => tmsService.reportsBilling(query) });
  const operations = operationsQuery.data ?? {};
  const billing = billingQuery.data ?? {};
  const orderGroups = recordArray(operations.orders);
  const incidentGroups = recordArray(operations.incidents);
  const proofGroups = recordArray(operations.proofs);
  const paymentGroups = recordArray(billing.payments);
  const totalOrders = sumCount(orderGroups);
  const delivered = countByGroup(orderGroups, "status", "DELIVERED");
  const incidents = sumCount(incidentGroups);
  const revenue = sumAmount(paymentGroups);
  const chartValues = normalizeBars(orderGroups.map((group) => groupCount(group)));

  const exportReport = async (type: "operations" | "billing", format: ReportFormat) => {
    const blob = await tmsService.exportReport(type, format, query);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${type}-${range}d.${format === "xlsx" ? "xls" : format}`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`Reporte ${type} exportado en ${format.toUpperCase()}`);
  };

  return <div><PageHeader title="Reportes" subtitle="Rendimiento operativo, ingresos y SLA" />
    {(operationsQuery.isLoading || billingQuery.isLoading) && <div className="inline-alert inline-alert--info">Generando reportes desde transport-api...</div>}
    {(operationsQuery.isError || billingQuery.isError) && <div className="inline-alert">No se pudieron cargar los reportes.</div>}
    <section className="stats-grid"><StatCard stat={{ label: "Ingresos", value: `RD$ ${revenue.toLocaleString("es-DO")}`, helper: `Últimos ${range} días`, tone: "slate" }} /><StatCard stat={{ label: "OTD", value: totalOrders ? `${Math.round((delivered / totalOrders) * 100)}%` : "0%", helper: "Entregadas / total", tone: "green" }} /><StatCard stat={{ label: "Órdenes", value: String(totalOrders), helper: "Agrupadas por estado", tone: "blue" }} /><StatCard stat={{ label: "Incidencias", value: String(incidents), helper: "Por estado", tone: "orange" }} /></section>
    <section className="reports-layout"><article className="panel report-chart"><div className="panel-heading"><div><h2>Órdenes por estado</h2><p>Periodo seleccionado</p></div><div className="segmented"><button className={range === "7" ? "active" : ""} onClick={() => setRange("7")}>7 días</button><button className={range === "30" ? "active" : ""} onClick={() => setRange("30")}>30 días</button></div></div><div className="bar-chart">{chartValues.map((value, index) => <div key={index}><span style={{ height: `${value}%` }} className={index === 0 ? "highlight" : ""}><em>{value}</em></span><small>{String(orderGroups[index]?.status ?? "--").slice(0, 3)}</small></div>)}</div></article><aside className="panel export-panel"><div className="panel-heading"><div><h2>Exportar</h2><p>CSV, Excel y PDF desde API</p></div></div>{exportButtons.map((item) => <button key={`${item.type}-${item.format}`} onClick={() => void exportReport(item.type, item.format)}><Download size={16} /><span>{item.label}</span><ChevronRight size={15} /></button>)}</aside></section>
    <section className="panel indicators"><div className="panel-heading"><div><h2>Indicadores clave</h2><p>Comparación del filtro actual</p></div></div><div><span>Entregas</span><strong>{delivered} completadas</strong><em className="positive">{totalOrders} órdenes totales</em><StatusBadge>API</StatusBadge></div><div><span>Evidencias</span><strong>{sumCount(proofGroups)} registros</strong><em>Validación por estado</em><StatusBadge>Activo</StatusBadge></div><div><span>Pagos</span><strong>{paymentGroups.length} estados</strong><em className="positive">RD$ {revenue.toLocaleString("es-DO")}</em><StatusBadge>Billing</StatusBadge></div></section></div>;
}

const auditFilters = [
  { label: "Entidad", name: "entityType", options: ["ORDER", "USER", "RATE_CARD", "INCIDENT", "DELIVERY_PROOF", "SYSTEM_PARAMETER"].map((value) => ({ label: value, value })) },
];

export function AuditPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const query = useMemo(() => ({ search: deferredSearch, ...filters }), [deferredSearch, filters]);
  const auditQuery = useQuery({ queryKey: queryKeys.audit(query), queryFn: () => tmsService.audit(query), refetchInterval: 30000 });
  const logs = auditQuery.data ?? [];
  const rows = logs.map(mapAuditRow);
  const selected = rows.find((row) => row.id === selectedId) ?? rows[0];
  const selectedLog = logs.find((log) => String(log.id) === String(selected?.id));

  const exportAudit = () => {
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "auditoria.json";
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Registro de auditoría exportado desde API");
  };

  return <div><PageHeader title="Auditoría" subtitle="Trazabilidad de cambios y eventos críticos" onExport={exportAudit} />
    {auditQuery.isError && <div className="inline-alert">No se pudo cargar auditoría desde la API.</div>}
    {auditQuery.isLoading && <div className="inline-alert inline-alert--info">Sincronizando auditoría...</div>}
    <section className="stats-grid"><StatCard stat={{ label: "Eventos", value: String(rows.length), helper: "Filtro actual", tone: "blue" }} /><StatCard stat={{ label: "Entidades", value: String(new Set(rows.map((row) => row.entidad)).size), helper: "Con actividad", tone: "green" }} /><StatCard stat={{ label: "Actores", value: String(new Set(rows.map((row) => row.actor)).size), helper: "Usuarios/Sistema", tone: "slate" }} /><StatCard stat={{ label: "IPs", value: String(new Set(rows.map((row) => row.ip)).size), helper: "Origen de cambios", tone: "red" }} /></section>
    <SearchFilters search={search} onSearch={setSearch} filters={auditFilters} values={filters} onFilterChange={(name, value) => setFilters((current) => ({ ...current, [name]: value }))} />
    <section className="audit-layout"><article className="panel audit-list"><div className="panel-heading"><div><h2>Registro de eventos</h2><p>Todos los eventos vienen de /audit</p></div></div>{rows.map((event) => <button className={selected?.id === event.id ? "selected" : ""} key={event.id} onClick={() => setSelectedId(String(event.id))}><time>{String(event.hora)}</time><span><strong>{String(event.accion)}</strong><small>{String(event.actor)} · {String(event.entidad)}</small></span><ChevronRight size={15} /></button>)}</article><aside className="dark-insight audit-change"><span>Cambio seleccionado</span><h3>{String(selected?.accion ?? "Sin evento")}</h3><p>{String(selected?.actor ?? "Sistema")} · {String(selected?.entidad ?? "--")}</p><div><span>Entidad ID</span><strong>{String(selected?.entityId ?? "--")}</strong></div><div><span>IP</span><strong>{String(selected?.ip ?? "--")}</strong></div><div><span>Payload</span><strong>{selectedLog ? payloadSize(selectedLog) : "--"}</strong></div><StatusBadge>Auditado</StatusBadge></aside></section></div>;
}

const settingsCards = [
  { icon: Users, title: "Roles y permisos", copy: "Despacho, auditoría, finanzas", status: "roles" },
  { icon: Map, title: "Mapas y GPS", copy: "Google Maps · tracking", status: "parameters" },
  { icon: Bell, title: "Notificaciones", copy: "Push, correo operativo", status: "catalogs" },
  { icon: Cloud, title: "Almacenamiento", copy: "Evidencias y documentos", status: "parameters" },
  { icon: PlugZap, title: "Integraciones", copy: "Pagos, webhooks y APIs externas", status: "catalogs" },
  { icon: KeyRound, title: "Seguridad y API Keys", copy: "Credenciales y rotación", status: "parameters" },
];

const userColumns = [
  { key: "usuario", label: "Usuario", type: "strong" as const },
  { key: "email", label: "Email" },
  { key: "telefono", label: "Teléfono" },
  { key: "roles", label: "Roles" },
  { key: "estado", label: "Estado", type: "status" as const },
];

export function SettingsPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const query = useMemo(() => ({ search: deferredSearch }), [deferredSearch]);
  const usersQuery = useQuery({ queryKey: queryKeys.users(query), queryFn: () => tmsService.users(query) });
  const rolesQuery = useQuery({ queryKey: ["roles"], queryFn: () => tmsService.roles() });
  const parametersQuery = useQuery({ queryKey: queryKeys.parameters(), queryFn: () => tmsService.parameters() });
  const catalogsQuery = useQuery({ queryKey: queryKeys.catalogs(), queryFn: () => tmsService.catalogs() });
  const users = (usersQuery.data ?? []).map(mapUserRow);
  const roles = rolesQuery.data ?? [];
  const parameters = (parametersQuery.data ?? []).map(mapParameterRow);
  const catalogs = (catalogsQuery.data ?? []).map(mapCatalogRow);
  const fields = [
    { name: "fullName", label: "Nombre completo" },
    { name: "email", label: "Correo", type: "email" as const },
    { name: "phone", label: "Teléfono" },
    { name: "password", label: "Contraseña temporal", type: "password" as const },
    { name: "roles", label: "Roles separados por coma", placeholder: "ADMIN, OPERATOR" },
  ];

  const createUser = async (values: Record<string, string>) => {
    try {
      await tmsService.createUser(values);
      await queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Usuario creado en transport-api");
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo crear usuario");
    }
  };

  return <div><PageHeader title="Configuración" subtitle="Roles, integraciones y reglas del sistema" action="Nuevo usuario" onAction={() => setOpen(true)} />
    {(usersQuery.isLoading || rolesQuery.isLoading || parametersQuery.isLoading || catalogsQuery.isLoading) && <div className="inline-alert inline-alert--info">Sincronizando configuración...</div>}
    {(usersQuery.isError || rolesQuery.isError || parametersQuery.isError || catalogsQuery.isError) && <div className="inline-alert">No se pudo cargar toda la configuración desde la API.</div>}
    <section className="stats-grid"><StatCard stat={{ label: "Usuarios", value: String(users.length), helper: `${countRows(users, "ACTIVE")} activos`, tone: "blue" }} /><StatCard stat={{ label: "Roles", value: String(roles.length), helper: "Desde /roles", tone: "slate" }} /><StatCard stat={{ label: "Parámetros", value: String(parameters.length), helper: "Sistema", tone: "green" }} /><StatCard stat={{ label: "Catálogos", value: String(catalogs.length), helper: "Operación", tone: "orange" }} /></section>
    <SearchFilters search={search} onSearch={setSearch} filters={[]} />
    <section className="settings-layout"><article className="panel settings-panel"><div className="panel-heading"><div><h2>Panel de configuración</h2><p>Administración del entorno productivo</p></div></div>{settingsCards.map((item) => <button key={item.title} onClick={() => toast.info(`${item.title} sincronizado con ${item.status}`)}><div className="setting-icon"><item.icon size={18} /></div><span><strong>{item.title}</strong><small>{item.copy}</small></span><StatusBadge>{statusFor(item.status, roles.length, parameters.length, catalogs.length)}</StatusBadge><ChevronRight size={15} /></button>)}</article><aside className="system-health"><div className="panel-heading"><div><h2>Estado del sistema</h2><p>Datos consultados desde API</p></div><Activity size={20} /></div><div className="health-score"><strong>{usersQuery.isSuccess ? "OK" : "--"}</strong><span>API principal</span></div><p><i className="green-dot" /> Configuración consultada vía JWT</p><div><span>Usuarios</span><strong>{users.length}</strong></div><div><span>Roles</span><strong>{roles.length}</strong></div><div><span>Parámetros</span><strong>{parameters.length}</strong></div><div><span>Catálogos</span><strong>{catalogs.length}</strong></div><Button variant="secondary"><ShieldCheck size={16} /> Ver seguridad</Button></aside></section>
    <div style={{ marginTop: 12 }}><DataTable columns={userColumns} rows={users} onView={() => undefined} onEdit={(row) => tmsService.updateUserStatus(String(row.id), row.estado === "ACTIVE" ? "INACTIVE" : "ACTIVE").then(() => queryClient.invalidateQueries({ queryKey: ["users"] })).then(() => toast.success("Estado de usuario actualizado")).catch((error: unknown) => toast.error(error instanceof Error ? error.message : "No se pudo actualizar usuario"))} onDelete={() => toast.info("Desactivar usuario usa Editar para mantener auditoría.")} /></div>
    <Modal open={open} onClose={() => setOpen(false)} title="Crear usuario" description="Asigna roles y estado inicial de cuenta." wide><EntityForm fields={fields} onCancel={() => setOpen(false)} onSubmit={createUser} /></Modal></div>;
}

function recordArray(value: unknown): AnyRecord[] {
  return Array.isArray(value) ? value.filter((item): item is AnyRecord => Boolean(item && typeof item === "object" && !Array.isArray(item))) : [];
}

function daysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

function groupCount(group: AnyRecord) {
  const count = group._count;
  return typeof count === "object" && count && "_all" in count ? Number(count._all) : 0;
}

function sumCount(groups: AnyRecord[]) {
  return groups.reduce((total, group) => total + groupCount(group), 0);
}

function countByGroup(groups: AnyRecord[], field: string, value: string) {
  return groups.filter((group) => group[field] === value).reduce((total, group) => total + groupCount(group), 0);
}

function sumAmount(groups: AnyRecord[]) {
  return groups.reduce((total, group) => {
    const sum = group._sum;
    const amount = typeof sum === "object" && sum && "amount" in sum ? Number(sum.amount) : 0;
    return total + (Number.isFinite(amount) ? amount : 0);
  }, 0);
}

function normalizeBars(values: number[]) {
  const safeValues = values.length ? values : [0, 0, 0, 0, 0, 0, 0];
  const max = Math.max(...safeValues, 1);
  return safeValues.map((value) => Math.max(8, Math.round((value / max) * 96)));
}

function payloadSize(log: AnyRecord) {
  return `${JSON.stringify({ oldValues: log.oldValues, newValues: log.newValues }).length} bytes`;
}

function countRows(rows: Array<Record<string, string | number>>, status: string) {
  return rows.filter((row) => row.estado === status).length;
}

function statusFor(key: string, roles: number, parameters: number, catalogs: number) {
  if (key === "roles") return `${roles} roles`;
  if (key === "parameters") return `${parameters} params`;
  return `${catalogs} catálogos`;
}
