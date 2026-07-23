import { useDeferredValue, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  ConfirmDialog,
  Button,
  DataTable,
  Drawer,
  EntityForm,
  Modal,
  PageHeader,
  SearchFilters,
  StatCard,
} from "@/components/ui";
import { OrderForm } from "@/features/orders/OrderForm";
import {
  isApiModule,
  tmsService,
  type AnyRecord,
} from "@/services/tms.service";
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
  const [assigning, setAssigning] = useState<DataRow | null>(null);
  const [assignmentDriverId, setAssignmentDriverId] = useState("");
  const [assignmentVehicleId, setAssignmentVehicleId] = useState("");
  const [assignmentSaving, setAssignmentSaving] = useState(false);
  const apiEnabled = isApiModule(config.key);
  const query = useMemo(
    () => ({ search: deferredSearch, ...filters }),
    [deferredSearch, filters],
  );
  const needsOrderLookups = Boolean(modal) && config.key === "orders";
  const needsDriverLookups = Boolean(modal) && config.key === "drivers";
  const needsVehicleLookups = Boolean(modal) && config.key === "vehicles";
  const remoteRows = useQuery({
    queryKey: ["tms-module", config.key, query],
    queryFn: () => tmsService.listModuleRows(config.key, query),
    enabled: apiEnabled,
    refetchInterval: config.key === "orders" ? 15000 : false,
  });
  const customerOptions = useQuery({
    queryKey: ["lookup", "customers"],
    queryFn: () => tmsService.customers({ pageSize: 100 }),
    enabled: needsOrderLookups,
  });
  const categoryOptions = useQuery({
    queryKey: ["lookup", "vehicle-categories"],
    queryFn: () => tmsService.vehicleCategories(),
    enabled: needsOrderLookups || needsVehicleLookups,
  });
  const userOptions = useQuery({
    queryKey: ["lookup", "users"],
    queryFn: () => tmsService.users({ pageSize: 100 }),
    enabled: needsDriverLookups,
  });
  const driverOptions = useQuery({
    queryKey: ["lookup", "drivers"],
    queryFn: () => tmsService.drivers(),
    enabled: needsVehicleLookups,
  });
  const assignmentDriverOptions = useQuery({
    queryKey: ["lookup", "drivers", "assignment"],
    queryFn: () => tmsService.drivers({ availabilityStatus: "AVAILABLE" }),
    enabled: config.key === "orders" && Boolean(assigning),
  });
  const assignmentVehicleOptions = useQuery({
    queryKey: [
      "lookup",
      "vehicles",
      "assignment",
      assignmentDriverId,
      assigning?.vehicleCategoryId,
    ],
    queryFn: () =>
      tmsService.vehicles({
        driverId: assignmentDriverId,
        status: "ACTIVE",
        categoryId: String(assigning?.vehicleCategoryId ?? ""),
      }),
    enabled: config.key === "orders" && Boolean(assigning) && Boolean(assignmentDriverId),
  });

  const rows = useMemo(
    () => (apiEnabled ? (remoteRows.data ?? []) : localRows),
    [apiEnabled, localRows, remoteRows.data],
  );
  const stats = useMemo(
    () => (apiEnabled ? buildApiStats(config.key, rows) : config.stats),
    [apiEnabled, config.key, config.stats, rows],
  );
  const fields = useMemo(
    () =>
      hydrateFields(config.fields, {
        customers: customerOptions.data ?? [],
        categories: categoryOptions.data ?? [],
        users: userOptions.data ?? [],
        drivers: driverOptions.data ?? [],
      }),
    [
      categoryOptions.data,
      config.fields,
      customerOptions.data,
      driverOptions.data,
      userOptions.data,
    ],
  );

  const filteredRows = useMemo(
    () =>
      apiEnabled
        ? rows
        : rows.filter((row) =>
            Object.values(row).some((value) =>
              String(value).toLowerCase().includes(search.toLowerCase()),
            ),
          ),
    [apiEnabled, rows, search],
  );

  const save = async (values: Record<string, string>) => {
    if (apiEnabled) {
      try {
        if (config.key === "orders" && modal !== "edit") {
          await tmsService.createTmsOrder(values);
          toast.success(
            values.submitMode === "CREATE_AND_QUOTE"
              ? "Orden creada con cotización provisional"
              : "Orden guardada como borrador",
          );
        } else if (config.key === "drivers") {
          if (modal === "edit" && selected)
            await tmsService.updateDriver(values, String(selected.id));
          else await tmsService.createDriver(values);
          toast.success("Conductor sincronizado con transport-api");
        } else if (config.key === "vehicles") {
          if (modal === "edit" && selected)
            await tmsService.updateVehicle(values, String(selected.id));
          else await tmsService.createVehicle(values);
          toast.success("Vehículo sincronizado con transport-api");
        } else {
          toast.info(
            "Este módulo usa datos de API; la creación se gestiona desde onboarding/configuración.",
          );
        }
        await queryClient.invalidateQueries({
          queryKey: ["tms-module", config.key],
        });
        setModal(null);
        setSelected(null);
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "No se pudo sincronizar con la API",
        );
      }
      return;
    }

    if (modal === "edit" && selected) {
      setLocalRows((current) =>
        current.map((row) =>
          row.id === selected.id ? { ...row, ...values } : row,
        ),
      );
      toast.success(`${selected.id} fue actualizado`);
    } else {
      const id = `${config.key.slice(0, 3).toUpperCase()}-${String(Date.now()).slice(-5)}`;
      setLocalRows((current) => [
        { id, ...values, estado: values.estado || "Pendiente" },
        ...current,
      ]);
      toast.success("Registro creado correctamente");
    }
    setModal(null);
    setSelected(null);
  };

  const exportRows = () => {
    const header = config.columns.map((column) => column.label).join(",");
    const body = rows
      .map((row) =>
        config.columns
          .map(
            (column) =>
              `"${String(row[column.key] ?? "").replaceAll('"', '""')}"`,
          )
          .join(","),
      )
      .join("\n");
    const url = URL.createObjectURL(
      new Blob([`${header}\n${body}`], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `${config.key}-ruta-rd.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Exportación CSV completada");
  };

  const submitAssignment = async () => {
    if (!assigning) return;
    if (!assignmentDriverId || !assignmentVehicleId) {
      toast.error("Selecciona conductor y vehiculo");
      return;
    }

    setAssignmentSaving(true);
    try {
      await tmsService.assignOrder({
        orderId: String(assigning._id ?? assigning.id),
        driverId: assignmentDriverId,
        vehicleId: assignmentVehicleId,
      });
      toast.success("Orden asignada al conductor");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["tms-module", "orders"] }),
        queryClient.invalidateQueries({ queryKey: ["lookup", "drivers"] }),
        queryClient.invalidateQueries({ queryKey: ["lookup", "vehicles"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-orders"] }),
      ]);
      setAssigning(null);
      setSelected(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo asignar la orden");
    } finally {
      setAssignmentSaving(false);
    }
  };

  const openAssignment = (row: DataRow) => {
    setAssignmentDriverId("");
    setAssignmentVehicleId("");
    setAssigning(row);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <PageHeader
        title={config.title}
        subtitle={config.subtitle}
        action={config.action}
        onAction={() => setModal("create")}
        onExport={exportRows}
      />
      {remoteRows.isError && (
        <div className="inline-alert">
          No se pudo cargar la API. Revisa la sesión o los filtros enviados.
        </div>
      )}
      {remoteRows.isLoading && (
        <div className="inline-alert inline-alert--info">
          Sincronizando con transport-api...
        </div>
      )}
      <section className="stats-grid">
        {stats.map((stat) => (
          <StatCard key={stat.label} stat={stat} />
        ))}
      </section>
      <SearchFilters
        search={search}
        onSearch={setSearch}
        filters={config.filters}
        values={filters}
        onFilterChange={(name, value) =>
          setFilters((current) => ({ ...current, [name]: value }))
        }
      />
      <DataTable
        columns={config.columns}
        rows={filteredRows}
        onView={setSelected}
        onEdit={(row) => {
          setSelected(row);
          setModal("edit");
        }}
        onDelete={setDeleting}
      />
      <Modal
        open={Boolean(modal)}
        onClose={() => {
          setModal(null);
          setSelected(null);
        }}
        title={
          modal === "edit" ? `Editar ${displayName(selected)}` : config.action
        }
        description="Completa la información operativa. Los campos marcados son obligatorios."
        wide
      >
        {config.key === "orders" && modal !== "edit" ? (
          <OrderForm
            onSubmit={save}
            onCancel={() => {
              setModal(null);
              setSelected(null);
            }}
          />
        ) : (
          <EntityForm
            key={`${modal}-${selected?.id ?? "new"}`}
            fields={fields}
            initial={modal === "edit" ? (selected ?? undefined) : undefined}
            submitLabel={
              modal === "edit" ? "Guardar cambios" : "Crear registro"
            }
            onSubmit={save}
            onCancel={() => {
              setModal(null);
              setSelected(null);
            }}
          />
        )}
      </Modal>
      <Drawer
        row={modal ? null : selected}
        onClose={() => setSelected(null)}
        extraActions={
          config.key === "orders" && selected ? (
            <Button
              type="button"
              onClick={() => openAssignment(selected)}
              disabled={String(selected.conductor) !== "Sin asignar" || String(selected.estado) !== "REQUESTED"}
            >
              Asignar conductor
            </Button>
          ) : undefined
        }
      />
      <Modal
        open={Boolean(assigning)}
        onClose={() => setAssigning(null)}
        title={`Asignar ${assigning?.id ?? "orden"}`}
        description="Selecciona un conductor disponible y uno de sus vehiculos activos."
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void submitAssignment();
          }}
        >
          <div className="form-grid">
            <label className="span-2">
              <span>Conductor disponible</span>
              <select
                value={assignmentDriverId}
                onChange={(event) => {
                  setAssignmentDriverId(event.target.value);
                  setAssignmentVehicleId("");
                }}
              >
                <option value="">Seleccionar conductor</option>
                {(assignmentDriverOptions.data ?? []).map((driver) => {
                  const option = driverOption(driver);
                  return <option key={option.value} value={option.value}>{option.label}</option>;
                })}
              </select>
            </label>
            <label className="span-2">
              <span>Vehiculo activo</span>
              <select
                value={assignmentVehicleId}
                onChange={(event) => setAssignmentVehicleId(event.target.value)}
                disabled={!assignmentDriverId || assignmentVehicleOptions.isLoading}
              >
                <option value="">Seleccionar vehiculo</option>
                {(assignmentVehicleOptions.data ?? []).map((vehicle) => {
                  const option = vehicleOption(vehicle);
                  return <option key={option.value} value={option.value}>{option.label}</option>;
                })}
              </select>
            </label>
          </div>
          <div className="form-summary">
            <span>La orden pasara a ASSIGNED y el conductor recibira la asignacion por Socket.IO.</span>
          </div>
          <footer className="modal-actions">
            <Button type="button" variant="secondary" onClick={() => setAssigning(null)}>Cancelar</Button>
            <Button type="submit" disabled={assignmentSaving || !assignmentDriverId || !assignmentVehicleId}>
              {assignmentSaving ? "Asignando..." : "Asignar orden"}
            </Button>
          </footer>
        </form>
      </Modal>
      <ConfirmDialog
        row={deleting}
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting && !apiEnabled) {
            setLocalRows((current) =>
              current.filter((row) => row.id !== deleting.id),
            );
            toast.success(`${deleting.id} fue eliminado`);
          } else {
            toast.info(
              "La eliminación requiere endpoint explícito en transport-api.",
            );
          }
          setDeleting(null);
        }}
      />
    </motion.div>
  );
}

function hydrateFields(
  fields: FormField[],
  lookups: {
    customers: AnyRecord[];
    categories: AnyRecord[];
    users: AnyRecord[];
    drivers: AnyRecord[];
  },
): FormField[] {
  return fields.map((field) => {
    if (field.name === "customerId")
      return { ...field, options: lookups.customers.map(customerOption) };
    if (field.name === "vehicleCategoryId" || field.name === "categoryId")
      return { ...field, options: lookups.categories.map(categoryOption) };
    if (field.name === "userId")
      return { ...field, options: lookups.users.map(userOption) };
    if (field.name === "driverId")
      return { ...field, options: lookups.drivers.map(driverOption) };
    return field;
  });
}

function customerOption(customer: AnyRecord) {
  const user = asRecord(customer.user);
  const name =
    getString(customer, "companyName") ??
    getString(user, "fullName") ??
    "Cliente sin nombre";
  const meta = [getString(user, "phone"), getString(customer, "documentNumber")]
    .filter(Boolean)
    .join(" · ");
  const label = meta ? `${name} · ${meta}` : name;
  return { label, value: String(customer.id ?? "") };
}

function categoryOption(category: AnyRecord) {
  const capacity = [
    category.maxWeightKg ? `${String(category.maxWeightKg)} kg` : null,
    category.maxVolumenM3 ? `${String(category.maxVolumenM3)} m³` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return {
    label:
      `${String(category.name ?? "Categoría")} · ${String(category.code ?? "")}${capacity ? ` · ${capacity}` : ""}`.trim(),
    value: String(category.id ?? ""),
  };
}

function userOption(user: AnyRecord) {
  const roles = Array.isArray(user.roles)
    ? user.roles.map(String).join("/")
    : "";
  return {
    label: [
      String(user.fullName ?? "Usuario"),
      String(user.email ?? ""),
      String(user.phone ?? ""),
      roles,
    ]
      .filter(Boolean)
      .join(" · "),
    value: String(user.id ?? ""),
  };
}

function driverOption(driver: AnyRecord) {
  const user = asRecord(driver.user);
  return {
    label: [
      String(user?.fullName ?? "Conductor"),
      String(driver.licenseNumber ?? "sin licencia"),
      String(driver.availabilityStatus ?? ""),
    ]
      .filter(Boolean)
      .join(" · "),
    value: String(driver.id ?? ""),
  };
}

function vehicleOption(vehicle: AnyRecord) {
  const category = asRecord(vehicle.vehicleCategory);
  return {
    label: [
      String(vehicle.plateNumber ?? "Vehiculo"),
      `${String(vehicle.brand ?? "")} ${String(vehicle.model ?? "")}`.trim(),
      String(category?.name ?? ""),
      String(vehicle.status ?? ""),
    ]
      .filter(Boolean)
      .join(" · "),
    value: String(vehicle.id ?? ""),
  };
}

function buildApiStats(key: ModuleConfig["key"], rows: DataRow[]): Stat[] {
  if (key === "orders") {
    return [
      {
        label: "Solicitadas",
        value: String(count(rows, "REQUESTED")),
        helper: "Pendientes de despacho",
        tone: "blue",
      },
      {
        label: "Asignadas",
        value: String(count(rows, "ASSIGNED") + count(rows, "ACCEPTED")),
        helper: "Con conductor",
        tone: "slate",
      },
      {
        label: "En ruta",
        value: String(count(rows, "IN_PROGRESS")),
        helper: "Tracking activo",
        tone: "green",
      },
      {
        label: "Incidencia",
        value: String(count(rows, "FAILED") + count(rows, "CANCELLED")),
        helper: "Canceladas o fallidas",
        tone: "red",
      },
    ];
  }
  if (key === "drivers") {
    return [
      {
        label: "Disponibles",
        value: String(count(rows, "AVAILABLE")),
        helper: "Listos para asignar",
        tone: "green",
      },
      {
        label: "Ocupados",
        value: String(count(rows, "BUSY")),
        helper: "En servicio",
        tone: "blue",
      },
      {
        label: "Offline",
        value: String(count(rows, "OFFLINE")),
        helper: "Sin conexión",
        tone: "orange",
      },
      {
        label: "Total",
        value: String(rows.length),
        helper: "Conductores API",
        tone: "slate",
      },
    ];
  }
  if (key === "vehicles") {
    return [
      {
        label: "Activas",
        value: String(count(rows, "ACTIVE")),
        helper: "Disponibles en flota",
        tone: "green",
      },
      {
        label: "Mantenimiento",
        value: String(count(rows, "MAINTENANCE")),
        helper: "No asignables",
        tone: "orange",
      },
      {
        label: "Inactivas",
        value: String(count(rows, "INACTIVE") + count(rows, "SUSPENDED")),
        helper: "Fuera de operación",
        tone: "red",
      },
      {
        label: "Total",
        value: String(rows.length),
        helper: "Unidades API",
        tone: "slate",
      },
    ];
  }
  return [
    {
      label: "Cuentas",
      value: String(rows.length),
      helper: "Clientes API",
      tone: "blue",
    },
    {
      label: "Activas",
      value: String(count(rows, "ACTIVE")),
      helper: "Usuarios activos",
      tone: "green",
    },
    {
      label: "Empresas",
      value: String(count(rows, "BUSINESS", "tipo")),
      helper: "B2B",
      tone: "slate",
    },
    {
      label: "Individuales",
      value: String(count(rows, "INDIVIDUAL", "tipo")),
      helper: "B2C",
      tone: "orange",
    },
  ];
}

function count(rows: DataRow[], value: string, field = "estado") {
  return rows.filter((row) => String(row[field]) === value).length;
}

function asRecord(value: unknown): AnyRecord | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as AnyRecord)
    : undefined;
}

function getString(
  source: AnyRecord | undefined,
  key: string,
): string | undefined {
  const value = source?.[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function displayName(row: DataRow | null) {
  if (!row) return "registro";
  return String(
    row.orden ??
      row.cliente ??
      row.nombre ??
      row.placa ??
      row.usuario ??
      row.id,
  );
}
