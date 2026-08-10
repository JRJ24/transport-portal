import { useDeferredValue, useMemo, useState, type FormEvent } from "react";
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
  const [paymentVerifying, setPaymentVerifying] = useState(false);
  const [driverVerificationSaving, setDriverVerificationSaving] = useState(false);
  const [checkRegistering, setCheckRegistering] = useState<DataRow | null>(null);
  const [checkSaving, setCheckSaving] = useState(false);
  const [checkValues, setCheckValues] = useState({ bankName: "", checkNumber: "", amount: "", notes: "" });
  const [creditApproving, setCreditApproving] = useState<DataRow | null>(null);
  const [creditApprovalSaving, setCreditApprovalSaving] = useState(false);
  const [creditApprovalValues, setCreditApprovalValues] = useState({ amount: "", notes: "" });
  const [creditEditing, setCreditEditing] = useState<DataRow | null>(null);
  const [creditSaving, setCreditSaving] = useState(false);
  const [creditValues, setCreditValues] = useState({ creditLimit: "", creditDays: "15", status: "ACTIVE", notes: "" });
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
    queryFn: () => tmsService.drivers({ availabilityStatus: "AVAILABLE", verificationStatus: "APPROVED" }),
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
  const selectedPaymentId = selected ? String(selected.paymentId ?? "") : "";
  const selectedPaymentStatus = selected ? String(selected.estadoPagoInterno ?? selected.estadoPago ?? "") : "";
  const canAssignSelected = Boolean(
    selected &&
      String(selected.conductor) === "Sin asignar" &&
      String(selected.estadoInterno) === "REQUESTED" &&
      ["PAID", "AUTHORIZED"].includes(selectedPaymentStatus),
  );
  const canRegisterCheckSelected = Boolean(
    selected &&
      config.key === "orders" &&
      !["PAID", "AUTHORIZED"].includes(selectedPaymentStatus) &&
      Number(selected.precio) > 0,
  );
  const canApproveCorporateCreditSelected = Boolean(
    selected &&
      config.key === "orders" &&
      String(selected.customerType) === "BUSINESS" &&
      !["PAID", "AUTHORIZED"].includes(selectedPaymentStatus) &&
      Number(selected.precio) > 0,
  );

  const save = async (values: Record<string, string>) => {
    if (apiEnabled) {
      try {
        if (config.key === "orders") {
          if (modal === "edit" && selected) {
            await tmsService.updateOrderStatus(
              String(selected._id ?? selected.id),
              values.estadoInterno,
            );
            toast.success("Estado de orden actualizado");
          } else {
            await tmsService.createTmsOrder(values);
            toast.success(
              values.submitMode === "CREATE_AND_QUOTE"
                ? "Orden creada con cotización provisional"
                : "Orden guardada como borrador",
            );
          }
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
        } else if (config.key === "customers") {
          if (modal === "edit" && selected)
            await tmsService.updateTmsCustomer(values, String(selected.id));
          else await tmsService.createTmsCustomer(values);
          toast.success("Cliente sincronizado con transport-api");
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

  const openCheckRegistration = (row: DataRow) => {
    setCheckValues({
      bankName: "",
      checkNumber: "",
      amount: String(row.precio ?? ""),
      notes: "",
    });
    setCheckRegistering(row);
  };

  const submitCheckRegistration = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!checkRegistering) return;

    const amount = checkValues.amount ? Number(checkValues.amount) : undefined;
    if (!checkValues.bankName.trim() || !checkValues.checkNumber.trim()) {
      toast.error("Indica banco y numero de cheque");
      return;
    }
    if (amount !== undefined && (!Number.isFinite(amount) || amount < 0)) {
      toast.error("Indica un monto valido");
      return;
    }

    setCheckSaving(true);
    try {
      await tmsService.registerCheckPayment({
        orderId: String(checkRegistering._id ?? checkRegistering.id),
        bankName: checkValues.bankName.trim(),
        checkNumber: checkValues.checkNumber.trim(),
        amount,
        notes: checkValues.notes.trim() || undefined,
      });
      toast.success("Cheque registrado y despacho autorizado");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["tms-module", "orders"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-orders"] }),
      ]);
      setCheckRegistering(null);
      setSelected(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo registrar el cheque");
    } finally {
      setCheckSaving(false);
    }
  };

  const openCorporateCreditApproval = (row: DataRow) => {
    setCreditApprovalValues({
      amount: String(row.precio ?? ""),
      notes: "",
    });
    setCreditApproving(row);
  };

  const submitCorporateCreditApproval = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!creditApproving) return;

    const amount = creditApprovalValues.amount ? Number(creditApprovalValues.amount) : undefined;
    if (amount !== undefined && (!Number.isFinite(amount) || amount < 0)) {
      toast.error("Indica un monto valido");
      return;
    }

    setCreditApprovalSaving(true);
    try {
      await tmsService.approveCorporateCreditPayment({
        orderId: String(creditApproving._id ?? creditApproving.id),
        amount,
        notes: creditApprovalValues.notes.trim() || undefined,
      });
      toast.success("Credito aprobado y despacho autorizado");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["tms-module", "orders"] }),
        queryClient.invalidateQueries({ queryKey: ["tms-module", "customers"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-orders"] }),
      ]);
      setCreditApproving(null);
      setSelected(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo aprobar el credito");
    } finally {
      setCreditApprovalSaving(false);
    }
  };

  const openCreditEditor = (row: DataRow) => {
    const currentStatus = String(row.creditStatus ?? "ACTIVE");
    setCreditValues({
      creditLimit: String(row.creditLimit ?? ""),
      creditDays: String(row.creditDays ?? "15"),
      status: ["ACTIVE", "PENDING", "BLOCKED"].includes(currentStatus) ? currentStatus : "ACTIVE",
      notes: String(row.creditNotes ?? ""),
    });
    setCreditEditing(row);
  };

  const submitCreditEditor = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!creditEditing) return;

    const creditLimit = Number(creditValues.creditLimit);
    const creditDays = Number(creditValues.creditDays);
    if (!Number.isFinite(creditLimit) || creditLimit < 0) {
      toast.error("Indica un limite de credito valido");
      return;
    }
    if (!Number.isFinite(creditDays) || creditDays < 1) {
      toast.error("Indica dias de credito validos");
      return;
    }

    setCreditSaving(true);
    try {
      await tmsService.updateCustomerCredit(String(creditEditing.id), {
        creditLimit,
        creditDays: Math.round(creditDays),
        status: creditValues.status,
        notes: creditValues.notes.trim() || undefined,
      });
      toast.success("Credito corporativo actualizado");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["tms-module", "customers"] }),
        queryClient.invalidateQueries({ queryKey: ["lookup", "customers"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] }),
      ]);
      setCreditEditing(null);
      setSelected(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo actualizar el credito");
    } finally {
      setCreditSaving(false);
    }
  };

  const verifySelectedPayment = async () => {
    if (!selectedPaymentId) {
      toast.error("La orden no tiene un pago CardNET asociado");
      return;
    }

    setPaymentVerifying(true);
    try {
      await tmsService.verifyPayment(selectedPaymentId);
      toast.success("Pago validado contra CardNET");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["tms-module", "orders"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-orders"] }),
      ]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo validar el pago");
    } finally {
      setPaymentVerifying(false);
    }
  };

  const updateSelectedDriverVerification = async (verificationStatus: "APPROVED" | "REJECTED") => {
    if (!selected) return;

    setDriverVerificationSaving(true);
    try {
      await tmsService.updateDriver({ verificationStatus }, String(selected.id));
      toast.success(verificationStatus === "APPROVED" ? "Conductor aprobado" : "Conductor rechazado");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["tms-module", "drivers"] }),
        queryClient.invalidateQueries({ queryKey: ["lookup", "drivers"] }),
        queryClient.invalidateQueries({ queryKey: ["lookup", "vehicles"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] }),
      ]);
      setSelected(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo actualizar la verificacion");
    } finally {
      setDriverVerificationSaving(false);
    }
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
            fields={config.key === "orders" && modal === "edit" ? fields.filter((field) => field.name === "estadoInterno") : fields}
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
        entityId={selected ? String(selected._id ?? selected.id) : undefined}
        entityType={entityTypeFor(config.key)}
        row={modal ? null : selected}
        onClose={() => setSelected(null)}
        extraActions={
          config.key === "drivers" && selected && selected.verificacion === "PENDING" ? (
            <>
              <Button
                type="button"
                variant="danger"
                onClick={() => void updateSelectedDriverVerification("REJECTED")}
                disabled={driverVerificationSaving}
              >
                Rechazar
              </Button>
              <Button
                type="button"
                onClick={() => void updateSelectedDriverVerification("APPROVED")}
                disabled={driverVerificationSaving}
              >
                Aprobar acceso
              </Button>
            </>
          ) : config.key === "orders" && selected ? (
            <>
              {selectedPaymentId ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => void verifySelectedPayment()}
                  disabled={paymentVerifying}
                >
                  {paymentVerifying ? "Validando..." : "Validar pago"}
                </Button>
              ) : undefined}
              {canRegisterCheckSelected ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => openCheckRegistration(selected)}
                >
                  Registrar cheque
                </Button>
              ) : undefined}
              {canApproveCorporateCreditSelected ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => openCorporateCreditApproval(selected)}
                >
                  Aprobar credito
                </Button>
              ) : undefined}
              <Button
                type="button"
                onClick={() => openAssignment(selected)}
                disabled={!canAssignSelected}
              >
                Asignar conductor
              </Button>
            </>
          ) : config.key === "customers" && selected ? (
            <Button
              type="button"
              variant="secondary"
              onClick={() => openCreditEditor(selected)}
            >
              Credito corporativo
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
            <span>La orden debe estar pagada o autorizada. Pasara a ASSIGNED y el conductor recibira la asignacion por Socket.IO.</span>
          </div>
          <footer className="modal-actions">
            <Button type="button" variant="secondary" onClick={() => setAssigning(null)}>Cancelar</Button>
            <Button type="submit" disabled={assignmentSaving || !assignmentDriverId || !assignmentVehicleId}>
              {assignmentSaving ? "Asignando..." : "Asignar orden"}
            </Button>
          </footer>
        </form>
      </Modal>
      <Modal
        open={Boolean(checkRegistering)}
        onClose={() => setCheckRegistering(null)}
        title={`Registrar cheque ${checkRegistering?.id ?? ""}`}
        description="El cheque recibido autoriza el despacho sin exponerlo al cliente final."
      >
        <form onSubmit={submitCheckRegistration}>
          <div className="form-grid">
            <label>
              <span>Banco</span>
              <input value={checkValues.bankName} onChange={(event) => setCheckValues((current) => ({ ...current, bankName: event.target.value }))} />
            </label>
            <label>
              <span>Numero de cheque</span>
              <input value={checkValues.checkNumber} onChange={(event) => setCheckValues((current) => ({ ...current, checkNumber: event.target.value }))} />
            </label>
            <label className="span-2">
              <span>Monto</span>
              <input min="0" type="number" value={checkValues.amount} onChange={(event) => setCheckValues((current) => ({ ...current, amount: event.target.value }))} />
            </label>
            <label className="span-2">
              <span>Notas</span>
              <textarea rows={3} value={checkValues.notes} onChange={(event) => setCheckValues((current) => ({ ...current, notes: event.target.value }))} />
            </label>
          </div>
          <footer className="modal-actions">
            <Button type="button" variant="secondary" onClick={() => setCheckRegistering(null)}>Cancelar</Button>
            <Button type="submit" disabled={checkSaving}>{checkSaving ? "Registrando..." : "Registrar cheque"}</Button>
          </footer>
        </form>
      </Modal>
      <Modal
        open={Boolean(creditApproving)}
        onClose={() => setCreditApproving(null)}
        title={`Aprobar credito ${creditApproving?.id ?? ""}`}
        description="Autoriza el despacho contra la linea de credito corporativa del cliente."
      >
        <form onSubmit={submitCorporateCreditApproval}>
          <div className="form-grid">
            <label className="span-2">
              <span>Monto</span>
              <input min="0" type="number" value={creditApprovalValues.amount} onChange={(event) => setCreditApprovalValues((current) => ({ ...current, amount: event.target.value }))} />
            </label>
            <label className="span-2">
              <span>Notas</span>
              <textarea rows={3} value={creditApprovalValues.notes} onChange={(event) => setCreditApprovalValues((current) => ({ ...current, notes: event.target.value }))} />
            </label>
          </div>
          <footer className="modal-actions">
            <Button type="button" variant="secondary" onClick={() => setCreditApproving(null)}>Cancelar</Button>
            <Button type="submit" disabled={creditApprovalSaving}>{creditApprovalSaving ? "Aprobando..." : "Aprobar credito"}</Button>
          </footer>
        </form>
      </Modal>
      <Modal
        open={Boolean(creditEditing)}
        onClose={() => setCreditEditing(null)}
        title={`Credito corporativo ${creditEditing?.cliente ?? creditEditing?.id ?? ""}`}
        description="Aprueba, actualiza o bloquea la linea de credito de clientes empresariales."
      >
        <form onSubmit={submitCreditEditor}>
          <div className="form-grid">
            <label>
              <span>Limite</span>
              <input min="0" type="number" value={creditValues.creditLimit} onChange={(event) => setCreditValues((current) => ({ ...current, creditLimit: event.target.value }))} />
            </label>
            <label>
              <span>Dias</span>
              <input min="1" type="number" value={creditValues.creditDays} onChange={(event) => setCreditValues((current) => ({ ...current, creditDays: event.target.value }))} />
            </label>
            <label className="span-2">
              <span>Estado</span>
              <select value={creditValues.status} onChange={(event) => setCreditValues((current) => ({ ...current, status: event.target.value }))}>
                <option value="ACTIVE">ACTIVE</option>
                <option value="PENDING">PENDING</option>
                <option value="BLOCKED">BLOCKED</option>
              </select>
            </label>
            <label className="span-2">
              <span>Notas</span>
              <textarea rows={3} value={creditValues.notes} onChange={(event) => setCreditValues((current) => ({ ...current, notes: event.target.value }))} />
            </label>
          </div>
          <footer className="modal-actions">
            <Button type="button" variant="secondary" onClick={() => setCreditEditing(null)}>Cancelar</Button>
            <Button type="submit" disabled={creditSaving}>{creditSaving ? "Guardando..." : "Guardar credito"}</Button>
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
            setDeleting(null);
            return;
          }

          if (!deleting) return;

          tmsService
            .deleteModuleRow(config.key, deleting)
            .then(() => queryClient.invalidateQueries({ queryKey: ["tms-module", config.key] }))
            .then(() => toast.success(`${deleting.id} fue desactivado`))
            .catch((error: unknown) =>
              toast.error(error instanceof Error ? error.message : "No se pudo desactivar"),
            )
            .finally(() => setDeleting(null));
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
        value: String(count(rows, "REQUESTED", "estadoInterno")),
        helper: "Pendientes de despacho",
        tone: "blue",
      },
      {
        label: "Asignadas",
        value: String(count(rows, "ASSIGNED", "estadoInterno") + count(rows, "ACCEPTED", "estadoInterno")),
        helper: "Con conductor",
        tone: "slate",
      },
      {
        label: "En ruta",
        value: String(count(rows, "IN_PROGRESS", "estadoInterno")),
        helper: "Tracking activo",
        tone: "green",
      },
      {
        label: "Incidencia",
        value: String(count(rows, "FAILED", "estadoInterno") + count(rows, "CANCELLED", "estadoInterno")),
        helper: "Canceladas o fallidas",
        tone: "red",
      },
    ];
  }
  if (key === "drivers") {
    return [
      {
        label: "Pendientes",
        value: String(count(rows, "PENDING")),
        helper: "Requieren aprobacion",
        tone: "orange",
      },
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

function entityTypeFor(key: ModuleConfig["key"]) {
  switch (key) {
    case "orders":
      return "ORDER";
    case "drivers":
      return "DRIVER";
    case "vehicles":
      return "VEHICLE";
    case "customers":
      return "CUSTOMER";
    default:
      return key.toUpperCase();
  }
}
