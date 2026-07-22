import { useDeferredValue, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { ConfirmDialog, DataTable, Drawer, EntityForm, Modal, PageHeader, SearchFilters, StatCard } from "@/components/ui";
import { isApiModule, tmsService, type AnyRecord } from "@/services/tms.service";
import type { DataRow, FormField, ModuleConfig, Stat } from "@/types/domain";

export function ModulePage({ config }: { config: ModuleConfig }) {
  const queryClient = useQueryClient();
  const [localRows, setLocalRows] = useState(config.rows);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [selected, setSelected] = useState<DataRow | null>(null);
  const [deleting, setDeleting] = useState<DataRow | null>(null);
  const apiEnabled = isApiModule(config.key);
  const query = useMemo(() => ({ search: deferredSearch, ...filters }), [deferredSearch, filters]);
  const needsOrderLookups = Boolean(modal) && config.key === "orders";
  const needsDriverLookups = Boolean(modal) && config.key === "drivers";
  const needsVehicleLookups = Boolean(modal) && config.key === "vehicles";
  const remoteRows = useQuery({
    queryKey: ["tms-module", config.key, query],
    queryFn: () => tmsService.listModuleRows(config.key, query),
    enabled: apiEnabled,
    refetchInterval: config.key === "orders" ? 15000 : false,
  });
  const customerOptions = useQuery({ queryKey: ["lookup", "customers"], queryFn: () => tmsService.customers({ pageSize: 100 }), enabled: needsOrderLookups });
  const categoryOptions = useQuery({ queryKey: ["lookup", "vehicle-categories"], queryFn: () => tmsService.vehicleCategories(), enabled: needsOrderLookups || needsVehicleLookups });
  const userOptions = useQuery({ queryKey: ["lookup", "users"], queryFn: () => tmsService.users({ pageSize: 100 }), enabled: needsDriverLookups });
  const driverOptions = useQuery({ queryKey: ["lookup", "drivers"], queryFn: () => tmsService.drivers(), enabled: needsVehicleLookups });
  const rows = useMemo(() => apiEnabled ? remoteRows.data ?? [] : localRows, [apiEnabled, localRows, remoteRows.data]);
  const stats = useMemo(() => apiEnabled ? buildApiStats(config.key, rows) : config.stats, [apiEnabled, config.key, config.stats, rows]);
  const fields = useMemo(() => hydrateFields(config.fields, {
    customers: customerOptions.data ?? [],
    categories: categoryOptions.data ?? [],
    users: userOptions.data ?? [],
    drivers: driverOptions.data ?? [],
  }), [categoryOptions.data, config.fields, customerOptions.data, driverOptions.data, userOptions.data]);

  const filteredRows = useMemo(() => apiEnabled ? rows : rows.filter((row) => Object.values(row).some((value) => String(value).toLowerCase().includes(search.toLowerCase()))), [apiEnabled, rows, search]);

  const save = async (values: Record<string, string>) => {
    if (apiEnabled) {
      try {
        if (config.key === "orders" && modal !== "edit") {
          await tmsService.createTmsOrder(values);
          toast.success("Orden creada en TMS y enviada a despacho");
        } else if (config.key === "drivers") {
          if (modal === "edit" && selected) await tmsService.updateDriver(values, String(selected.id));
          else await tmsService.createDriver(values);
          toast.success("Conductor sincronizado con transport-api");
        } else if (config.key === "vehicles") {
          if (modal === "edit" && selected) await tmsService.updateVehicle(values, String(selected.id));
          else await tmsService.createVehicle(values);
          toast.success("Vehículo sincronizado con transport-api");
        } else {
          toast.info("Este módulo usa datos de API; la creación se gestiona desde onboarding/configuración.");
        }
        await queryClient.invalidateQueries({ queryKey: ["tms-module", config.key] });
        setModal(null);
        setSelected(null);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo sincronizar con la API");
      }
      return;
    }

    if (modal === "edit" && selected) {
      setLocalRows((current) => current.map((row) => row.id === selected.id ? { ...row, ...values } : row));
      toast.success(`${selected.id} fue actualizado`);
    } else {
      const id = `${config.key.slice(0, 3).toUpperCase()}-${String(Date.now()).slice(-5)}`;
      setLocalRows((current) => [{ id, ...values, estado: values.estado || "Pendiente" }, ...current]);
      toast.success("Registro creado correctamente");
    }
    setModal(null);
    setSelected(null);
  };

  const exportRows = () => {
    const header = config.columns.map((column) => column.label).join(",");
    const body = rows.map((row) => config.columns.map((column) => `"${String(row[column.key] ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([`${header}\n${body}`], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = `${config.key}-ruta-rd.csv`; link.click(); URL.revokeObjectURL(url);
    toast.success("Exportación CSV completada");
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <PageHeader title={config.title} subtitle={config.subtitle} action={config.action} onAction={() => setModal("create")} onExport={exportRows} />
      {remoteRows.isError && <div className="inline-alert">No se pudo cargar la API. Revisa la sesión o los filtros enviados.</div>}
      {remoteRows.isLoading && <div className="inline-alert inline-alert--info">Sincronizando con transport-api...</div>}
      <section className="stats-grid">{stats.map((stat) => <StatCard key={stat.label} stat={stat} />)}</section>
      <SearchFilters search={search} onSearch={setSearch} filters={config.filters} values={filters} onFilterChange={(name, value) => setFilters((current) => ({ ...current, [name]: value }))} />
      <DataTable columns={config.columns} rows={filteredRows} onView={setSelected} onEdit={(row) => { setSelected(row); setModal("edit"); }} onDelete={setDeleting} />
      <Modal open={Boolean(modal)} onClose={() => { setModal(null); setSelected(null); }} title={modal === "edit" ? `Editar ${displayName(selected)}` : config.action} description="Completa la información operativa. Los campos marcados son obligatorios." wide>
        <EntityForm key={`${modal}-${selected?.id ?? "new"}`} fields={fields} initial={modal === "edit" ? selected ?? undefined : undefined} submitLabel={modal === "edit" ? "Guardar cambios" : "Crear registro"} onSubmit={save} onCancel={() => { setModal(null); setSelected(null); }} />
      </Modal>
      <Drawer row={modal ? null : selected} onClose={() => setSelected(null)} />
      <ConfirmDialog row={deleting} onCancel={() => setDeleting(null)} onConfirm={() => { if (deleting && !apiEnabled) { setLocalRows((current) => current.filter((row) => row.id !== deleting.id)); toast.success(`${deleting.id} fue eliminado`); } else { toast.info("La eliminación requiere endpoint explícito en transport-api."); } setDeleting(null); }} />
    </motion.div>
  );
}

function hydrateFields(fields: FormField[], lookups: { customers: AnyRecord[]; categories: AnyRecord[]; users: AnyRecord[]; drivers: AnyRecord[] }): FormField[] {
  return fields.map((field) => {
    if (field.name === "customerId") return { ...field, options: lookups.customers.map(customerOption) };
    if (field.name === "vehicleCategoryId" || field.name === "categoryId") return { ...field, options: lookups.categories.map(categoryOption) };
    if (field.name === "userId") return { ...field, options: lookups.users.map(userOption) };
    if (field.name === "driverId") return { ...field, options: lookups.drivers.map(driverOption) };
    return field;
  });
}

function customerOption(customer: AnyRecord) {
  const user = asRecord(customer.user);
  const label = getString(customer, "companyName") ?? getString(user, "fullName") ?? getString(customer, "documentNumber") ?? "Cliente sin nombre";
  return { label, value: String(customer.id ?? "") };
}

function categoryOption(category: AnyRecord) {
  return { label: `${String(category.name ?? "Categoría")} (${String(category.code ?? "")})`.trim(), value: String(category.id ?? "") };
}

function userOption(user: AnyRecord) {
  return { label: `${String(user.fullName ?? "Usuario")} · ${String(user.email ?? "")}`.trim(), value: String(user.id ?? "") };
}

function driverOption(driver: AnyRecord) {
  const user = asRecord(driver.user);
  return { label: `${String(user?.fullName ?? "Conductor")} · ${String(driver.licenseNumber ?? "sin licencia")}`, value: String(driver.id ?? "") };
}

function buildApiStats(key: ModuleConfig["key"], rows: DataRow[]): Stat[] {
  if (key === "orders") {
    return [
      { label: "Solicitadas", value: String(count(rows, "REQUESTED")), helper: "Pendientes de despacho", tone: "blue" },
      { label: "Asignadas", value: String(count(rows, "ASSIGNED") + count(rows, "ACCEPTED")), helper: "Con conductor", tone: "slate" },
      { label: "En ruta", value: String(count(rows, "IN_PROGRESS")), helper: "Tracking activo", tone: "green" },
      { label: "Incidencia", value: String(count(rows, "FAILED") + count(rows, "CANCELLED")), helper: "Canceladas o fallidas", tone: "red" },
    ];
  }
  if (key === "drivers") {
    return [
      { label: "Disponibles", value: String(count(rows, "AVAILABLE")), helper: "Listos para asignar", tone: "green" },
      { label: "Ocupados", value: String(count(rows, "BUSY")), helper: "En servicio", tone: "blue" },
      { label: "Offline", value: String(count(rows, "OFFLINE")), helper: "Sin conexión", tone: "orange" },
      { label: "Total", value: String(rows.length), helper: "Conductores API", tone: "slate" },
    ];
  }
  if (key === "vehicles") {
    return [
      { label: "Activas", value: String(count(rows, "ACTIVE")), helper: "Disponibles en flota", tone: "green" },
      { label: "Mantenimiento", value: String(count(rows, "MAINTENANCE")), helper: "No asignables", tone: "orange" },
      { label: "Inactivas", value: String(count(rows, "INACTIVE") + count(rows, "SUSPENDED")), helper: "Fuera de operación", tone: "red" },
      { label: "Total", value: String(rows.length), helper: "Unidades API", tone: "slate" },
    ];
  }
  return [
    { label: "Cuentas", value: String(rows.length), helper: "Clientes API", tone: "blue" },
    { label: "Activas", value: String(count(rows, "ACTIVE")), helper: "Usuarios activos", tone: "green" },
    { label: "Empresas", value: String(count(rows, "BUSINESS", "tipo")), helper: "B2B", tone: "slate" },
    { label: "Individuales", value: String(count(rows, "INDIVIDUAL", "tipo")), helper: "B2C", tone: "orange" },
  ];
}

function count(rows: DataRow[], value: string, field = "estado") {
  return rows.filter((row) => String(row[field]) === value).length;
}

function asRecord(value: unknown): AnyRecord | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? value as AnyRecord : undefined;
}

function getString(source: AnyRecord | undefined, key: string): string | undefined {
  const value = source?.[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function displayName(row: DataRow | null) {
  if (!row) return "registro";
  return String(row.orden ?? row.cliente ?? row.nombre ?? row.placa ?? row.usuario ?? row.id);
}
