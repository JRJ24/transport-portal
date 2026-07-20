import { useMemo, useState } from "react";
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
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [selected, setSelected] = useState<DataRow | null>(null);
  const [deleting, setDeleting] = useState<DataRow | null>(null);
  const apiEnabled = isApiModule(config.key);
  const remoteRows = useQuery({
    queryKey: ["tms-module", config.key],
    queryFn: () => tmsService.listModuleRows(config.key),
    enabled: apiEnabled,
    refetchInterval: config.key === "orders" ? 15000 : false,
  });
  const rows = remoteRows.data ?? localRows;

  const filteredRows = useMemo(() => rows.filter((row) => Object.values(row).some((value) => String(value).toLowerCase().includes(search.toLowerCase()))), [rows, search]);

  const save = async (values: Record<string, string>) => {
    if (config.key === "orders" && modal !== "edit") {
      try {
        await tmsService.createTmsOrder(values);
        await queryClient.invalidateQueries({ queryKey: ["tms-module", "orders"] });
        toast.success("Orden creada en TMS y enviada a despacho");
        setModal(null);
        setSelected(null);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo crear la orden");
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
      {remoteRows.isError && <div className="inline-alert">No se pudo cargar la API. Mostrando datos locales de respaldo.</div>}
      {remoteRows.isLoading && <div className="inline-alert inline-alert--info">Sincronizando con transport-api...</div>}
      <section className="stats-grid">{config.stats.map((stat) => <StatCard key={stat.label} stat={stat} />)}</section>
      <SearchFilters search={search} onSearch={setSearch} filters={config.filters} />
      <DataTable columns={config.columns} rows={filteredRows} onView={setSelected} onEdit={(row) => { setSelected(row); setModal("edit"); }} onDelete={setDeleting} />
      <Modal open={Boolean(modal)} onClose={() => { setModal(null); setSelected(null); }} title={modal === "edit" ? `Editar ${selected?.id}` : config.action} description="Completa la información operativa. Los campos marcados son obligatorios." wide>
        <EntityForm key={`${modal}-${selected?.id ?? "new"}`} fields={config.fields} initial={modal === "edit" ? selected ?? undefined : undefined} submitLabel={modal === "edit" ? "Guardar cambios" : "Crear registro"} onSubmit={save} onCancel={() => { setModal(null); setSelected(null); }} />
      </Modal>
      <Drawer row={modal ? null : selected} onClose={() => setSelected(null)} />
      <ConfirmDialog row={deleting} onCancel={() => setDeleting(null)} onConfirm={() => { if (deleting) { setLocalRows((current) => current.filter((row) => row.id !== deleting.id)); toast.success(`${deleting.id} fue eliminado localmente`); } setDeleting(null); }} />
    </motion.div>
  );
}
