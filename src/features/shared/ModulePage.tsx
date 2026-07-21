import { useDeferredValue, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { ConfirmDialog, DataTable, Drawer, EntityForm, Modal, PageHeader, SearchFilters, StatCard } from "@/components/ui";
import { isApiModule, tmsService } from "@/services/tms.service";
import type { DataRow, ModuleConfig } from "@/types/domain";

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
  const remoteRows = useQuery({
    queryKey: ["tms-module", config.key, query],
    queryFn: () => tmsService.listModuleRows(config.key, query),
    enabled: apiEnabled,
    refetchInterval: config.key === "orders" ? 15000 : false,
  });
  const rows = useMemo(() => apiEnabled ? remoteRows.data ?? [] : localRows, [apiEnabled, localRows, remoteRows.data]);

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
      <section className="stats-grid">{config.stats.map((stat) => <StatCard key={stat.label} stat={stat} />)}</section>
      <SearchFilters search={search} onSearch={setSearch} filters={config.filters} values={filters} onFilterChange={(name, value) => setFilters((current) => ({ ...current, [name]: value }))} />
      <DataTable columns={config.columns} rows={filteredRows} onView={setSelected} onEdit={(row) => { setSelected(row); setModal("edit"); }} onDelete={setDeleting} />
      <Modal open={Boolean(modal)} onClose={() => { setModal(null); setSelected(null); }} title={modal === "edit" ? `Editar ${selected?.id}` : config.action} description="Completa la información operativa. Los campos marcados son obligatorios." wide>
        <EntityForm key={`${modal}-${selected?.id ?? "new"}`} fields={config.fields} initial={modal === "edit" ? selected ?? undefined : undefined} submitLabel={modal === "edit" ? "Guardar cambios" : "Crear registro"} onSubmit={save} onCancel={() => { setModal(null); setSelected(null); }} />
      </Modal>
      <Drawer row={modal ? null : selected} onClose={() => setSelected(null)} />
      <ConfirmDialog row={deleting} onCancel={() => setDeleting(null)} onConfirm={() => { if (deleting && !apiEnabled) { setLocalRows((current) => current.filter((row) => row.id !== deleting.id)); toast.success(`${deleting.id} fue eliminado`); } else { toast.info("La eliminación requiere endpoint explícito en transport-api."); } setDeleting(null); }} />
    </motion.div>
  );
}
