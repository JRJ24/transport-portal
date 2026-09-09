import { api } from "@/lib/axios";
import { unwrapApiResponse } from "@/lib/api-response";
import type { ApiResponse } from "@/types/api.types";
import type { DataRow, ModuleKey } from "@/types/domain";

export type AnyRecord = Record<string, unknown>;
export type QueryParams = Record<
  string,
  string | number | boolean | Date | null | undefined
>;

export interface DashboardSummary {
  users: number;
  drivers: number;
  activeDrivers: number;
  vehicles: number;
  ordersByStatus: Record<string, number>;
  openIncidents: number;
  pendingOrders: number;
}

export interface LiveLocation {
  id: string;
  driverId: string;
  orderId: string;
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  speed?: number | null;
  batteryLevel?: number | null;
  recordedAt: string;
  receivedAt: string;
}

export interface HealthStatus {
  status: "ok" | "degraded";
  database: "up" | "down";
  uptimeSec: number;
  timestamp: string;
}

export type ReportFormat = "csv" | "xlsx" | "pdf";

const apiModules = new Set<ModuleKey>([
  "orders",
  "drivers",
  "vehicles",
  "customers",
]);

export function isApiModule(key: ModuleKey) {
  return apiModules.has(key);
}

export const tmsService = {
  async dashboard() {
    return getData<DashboardSummary>("/dashboard/summary");
  },

  async health() {
    return getData<HealthStatus>("/health");
  },

  async listModuleRows(
    key: ModuleKey,
    query?: QueryParams,
  ): Promise<DataRow[]> {
    switch (key) {
      case "orders":
        return (await this.orders(query)).map(mapOrderRow);
      case "drivers":
        return (await this.drivers(query)).map(mapDriverRow);
      case "vehicles":
        return (await this.vehicles(query)).map(mapVehicleRow);
      case "customers":
        return (await this.customers(query)).map(mapCustomerRow);
      default:
        return [];
    }
  },

  orders(query?: QueryParams) {
    return getList("/orders", query);
  },

  drivers(query?: QueryParams) {
    return getList("/drivers", query);
  },

  vehicles(query?: QueryParams) {
    return getList("/vehicles", query);
  },

  customers(query?: QueryParams) {
    return getList("/customers", query);
  },

  reservations(query?: QueryParams) {
    return getList("/reservations", query);
  },

  rateCards(query?: QueryParams) {
    return getList("/pricing/rate-cards", query);
  },

  incidents(query?: QueryParams) {
    return getList("/incidents", query);
  },

  deliveryProofs(query?: QueryParams) {
    return getList("/delivery-proofs", query);
  },

  audit(query?: QueryParams) {
    return getList("/audit", query);
  },

  parameters(query?: QueryParams) {
    return getList("/parameters", query);
  },

  catalogs(query?: QueryParams) {
    return getList("/catalogs", query);
  },

  users(query?: QueryParams) {
    return getList("/users", query);
  },

  roles() {
    return getList("/roles");
  },

  vehicleCategories(query?: QueryParams) {
    return getList("/vehicle-categories", query);
  },

  provinces() {
    return getList("/catalogs/provinces");
  },

  municipalities(provinceId: string) {
    return getList(`/catalogs/provinces/${provinceId}/municipalities`);
  },

  previewManualQuote(values: Record<string, string>) {
    return postData("/pricing/manual-quotes/preview", {
      customerId: values.customerId,
      vehicleCategoryId: values.vehicleCategoryId,
      originAddress: values.originAddress,
      destinationAddress: values.destinationAddress,
      ...manualQuotePayload(values),
    });
  },

  createTmsCustomer(values: Record<string, string>) {
    return postData("/customers/tms", {
      fullName: values.fullName,
      email: values.email,
      phone: values.phone,
      customerType: values.customerType,
      documentType: values.documentType,
      documentNumber: values.documentNumber,
      companyName: optionalString(values.companyName),
      billingEmail: optionalString(values.billingEmail),
    });
  },

  updateTmsCustomer(values: Record<string, string>, id: string) {
    return patchData(`/customers/${id}/tms`, {
      fullName: optionalString(values.fullName),
      email: optionalString(values.email),
      phone: optionalString(values.phone),
      customerType: optionalString(values.customerType),
      documentType: optionalString(values.documentType),
      documentNumber: optionalString(values.documentNumber),
      companyName: optionalString(values.companyName),
      billingEmail: optionalString(values.billingEmail),
    });
  },

  createUser(values: Record<string, string>) {
    return postData("/users", {
      fullName: values.fullName,
      email: values.email,
      phone: values.phone,
      password: values.password,
      roles: values.roles
        .split(",")
        .map((role) => role.trim())
        .filter(Boolean),
    });
  },

  updateUserStatus(id: string, status: string) {
    return patchData(`/users/${id}/status`, { status });
  },

  reportsOperations(query?: QueryParams) {
    return getData<AnyRecord>("/reports/operations", query);
  },

  reportsBilling(query?: QueryParams) {
    return getData<AnyRecord>("/reports/billing", query);
  },

  async exportReport(
    type: "operations" | "billing",
    format: ReportFormat,
    query?: QueryParams,
  ) {
    const response = await api.get<Blob>(`/reports/${type}/export`, {
      params: cleanParams({ ...query, format }),
      responseType: "blob",
    });
    return response.data;
  },

  async latestLocation(orderId: string) {
    const response = await api.get<ApiResponse<AnyRecord | null>>(
      `/locations/orders/${orderId}/latest`,
    );
    return unwrapApiResponse(response.data);
  },

  async createTmsOrder(values: Record<string, string>) {
    const submitMode = values.submitMode || "DRAFT";
    const payload = {
      customerId: values.customerId,
      vehicleCategoryId: values.vehicleCategoryId,
      serviceType: values.serviceType || "INMEDIATE",
      submitMode,
      scheduleAt: values.scheduleAt
        ? new Date(values.scheduleAt).toISOString()
        : undefined,
      distanceKm: optionalNumber(values.distanceKm),
      estimatedDurationMin: values.estimatedDurationMin
        ? Math.round(toNumber(values.estimatedDurationMin))
        : undefined,
      notes: values.notes || undefined,
      manualQuote:
        submitMode === "CREATE_AND_QUOTE"
          ? manualQuotePayload(values)
          : undefined,
      stops: [
        {
          stopType: "PICKUP",
          sequence: 1,
          contactName: values.originContactName,
          contactPhone: values.originContactPhone,
          addressLine: values.originAddress,
          city: values.originCity,
          province: values.originProvince,
          latitude: optionalNumber(values.originLatitude),
          longitude: optionalNumber(values.originLongitude),
          instructions: values.originInstructions || undefined,
        },
        {
          stopType: "DROPOFF",
          sequence: 2,
          contactName: values.destinationContactName,
          contactPhone: values.destinationContactPhone,
          addressLine: values.destinationAddress,
          city: values.destinationCity,
          province: values.destinationProvince,
          latitude: optionalNumber(values.destinationLatitude),
          longitude: optionalNumber(values.destinationLongitude),
          instructions: values.destinationInstructions || undefined,
        },
      ],
      items: [
        {
          description: values.itemDescription,
          quantity: Math.max(1, Math.round(toNumber(values.itemQuantity))),
          weightKg: toNumber(values.itemWeightKg),
          volumeM3: values.itemVolumeM3
            ? toNumber(values.itemVolumeM3)
            : undefined,
          declaredValue: values.itemDeclaredValue
            ? toNumber(values.itemDeclaredValue)
            : undefined,
          fragile: values.itemFragile === "true",
          requireHelper: values.itemRequireHelper === "true",
        },
      ],
    };

    return postData("/orders/tms", payload);
  },

  updateOrderStatus(id: string, status: string) {
    return patchData(`/orders/${id}/status`, { status });
  },

  createDriver(values: Record<string, string>) {
    return postData("/drivers", {
      userId: values.userId,
      licenseNumber: values.licenseNumber,
      licenseExpiration: toIso(values.licenseExpiration),
      availabilityStatus: optionalString(values.availabilityStatus),
      verificationStatus: optionalString(values.verificationStatus),
    });
  },

  updateDriver(values: Record<string, string>, id: string) {
    return patchData(`/drivers/${id}`, {
      userId: optionalString(values.userId),
      licenseNumber: optionalString(values.licenseNumber ?? values.licencia),
      licenseExpiration: values.licenseExpiration
        ? toIso(values.licenseExpiration)
        : undefined,
      availabilityStatus: optionalString(values.availabilityStatus ?? values.estadoInterno),
      verificationStatus: optionalString(values.verificationStatus),
    });
  },

  createVehicle(values: Record<string, string>) {
    return postData("/vehicles", {
      driverId: values.driverId,
      categoryId: values.categoryId,
      plateNumber: values.plateNumber,
      brand: values.brand,
      model: values.model,
      year: toNumber(values.year),
      color: values.color,
      status: optionalString(values.status),
    });
  },

  updateVehicle(values: Record<string, string>, id: string) {
    return patchData(`/vehicles/${id}`, {
      driverId: optionalString(values.driverId),
      categoryId: optionalString(values.categoryId),
      plateNumber: optionalString(values.plateNumber ?? values.placa),
      brand: optionalString(values.brand),
      model: optionalString(values.model),
      year: optionalNumber(values.year),
      color: optionalString(values.color),
      status: optionalString(values.status ?? values.estado),
    });
  },

  assignOrder(values: { orderId: string; driverId: string; vehicleId: string }) {
    return postData('/assignments', values);
  },

  verifyPayment(paymentId: string) {
    return postData(`/payments/${paymentId}/verify`, {});
  },

  paymentReceipt(paymentId: string) {
    return getData(`/payments/${paymentId}/receipt`);
  },

  registerCheckPayment(values: {
    orderId: string;
    bankName: string;
    checkNumber: string;
    amount?: string | number;
    receivedAt?: string;
    notes?: string;
  }) {
    return postData("/payments/checks", {
      orderId: values.orderId,
      bankName: values.bankName,
      checkNumber: values.checkNumber,
      amount: optionalNumber(values.amount),
      receivedAt: values.receivedAt
        ? new Date(values.receivedAt).toISOString()
        : undefined,
      notes: optionalString(values.notes),
    });
  },

  approveCorporateCreditPayment(values: {
    orderId: string;
    amount?: string | number;
    notes?: string;
  }) {
    return postData("/payments/corporate-credit", {
      orderId: values.orderId,
      amount: optionalNumber(values.amount),
      notes: optionalString(values.notes),
    });
  },

  updateCustomerCredit(id: string, values: {
    creditLimit: string | number;
    creditDays?: string | number;
    status?: string;
    notes?: string;
  }) {
    return patchData(`/customers/${id}/credit`, {
      creditLimit: toNumber(values.creditLimit),
      creditDays: values.creditDays
        ? Math.round(toNumber(values.creditDays))
        : undefined,
      status: optionalString(values.status),
      notes: optionalString(values.notes),
    });
  },

  createReservation(values: Record<string, string>) {
    return postData("/reservations", {
      orderId: values.orderId,
      reservedFor: toIso(values.reservedFor),
    });
  },

  rescheduleReservation(id: string, reservedFor: string) {
    return patchData(`/reservations/${id}/reschedule`, {
      reservedFor: toIso(reservedFor),
    });
  },

  cancelReservation(id: string) {
    return patchData(`/reservations/${id}/cancel`, {});
  },

  completeReservation(id: string) {
    return patchData(`/reservations/${id}/complete`, {});
  },

  deleteModuleRow(key: ModuleKey, row: DataRow) {
    const id = String(row._id ?? row.id);

    switch (key) {
      case "orders":
        return postData(`/orders/${id}/cancel`, {
          cancellationType: "ADMIN_CANCELLED",
          reason: "Eliminado desde portal TMS",
        });
      case "drivers":
        return deleteData(`/drivers/${id}`);
      case "vehicles":
        return deleteData(`/vehicles/${id}`);
      case "customers":
        return deleteData(`/customers/${id}`);
      default:
        throw new Error("Este modulo no tiene soft delete configurado");
    }
  },

  orderEvents(orderId: string) {
    return getList(`/orders/${orderId}/events`);
  },

  attachments(entityType: string, entityId: string) {
    return getList("/attachments", { entityType, entityId });
  },

  auditLogs(entityType: string, entityId: string) {
    return getList("/audit", { entityType, entityId });
  },

  createRateCard(values: Record<string, string>) {
    return postData("/pricing/rate-cards", {
      name: values.name,
      description: values.description,
      validFrom: toIso(values.validFrom),
      validTo: values.validTo ? toIso(values.validTo) : undefined,
      isActive: values.isActive ? values.isActive === "true" : undefined,
    });
  },

  createRateRule(rateCardId: string, values: Record<string, string>) {
    return postData(`/pricing/rate-cards/${rateCardId}/rules`, {
      vehicleCategoryId: values.vehicleCategoryId,
      baseFare: toNumber(values.baseFare),
      pricePerKm: toNumber(values.pricePerKm),
      pricePerMinute: toNumber(values.pricePerMinute),
      minimumFare: toNumber(values.minimumFare),
      helperFee: toNumber(values.helperFee),
      nightFee: toNumber(values.nightFee),
      waitingPricePerMinute: toNumber(values.waitingPricePerMinute),
      cancellationFee: toNumber(values.cancellationFee),
    });
  },

  createIncident(values: Record<string, string>) {
    return postData("/incidents", {
      orderId: values.orderId,
      incidentType: values.incidentType,
      severity: values.severity,
      title: values.title,
      description: values.description,
      latitude: toNumber(values.latitude),
      longitude: toNumber(values.longitude),
    });
  },

  updateIncidentStatus(id: string, status: string) {
    return patchData(`/incidents/${id}/status`, { status });
  },

  addIncidentComment(id: string, comment: string) {
    return postData(`/incidents/${id}/comments`, { comment });
  },

  createDeliveryProof(values: Record<string, string>) {
    return postData("/delivery-proofs", {
      orderId: values.orderId,
      proofType: values.proofType,
      recipientName: values.recipientName,
      recipientDocument: values.recipientDocument,
      notes: optionalString(values.notes),
      latitude: toNumber(values.latitude),
      longitude: toNumber(values.longitude),
    });
  },

  validateDeliveryProof(id: string, validationStatus: string) {
    return patchData(`/delivery-proofs/${id}/validate`, { validationStatus });
  },

  upsertParameter(values: Record<string, string>) {
    return putData("/parameters", {
      key: values.key,
      value: values.value,
      valueType: values.valueType,
      description: values.description,
    });
  },

  createCatalog(values: Record<string, string>) {
    return postData("/catalogs", {
      groupKey: values.groupKey,
      code: values.code,
      label: values.label,
      sortOrder: optionalNumber(values.sortOrder),
      isActive: values.isActive ? values.isActive === "true" : undefined,
    });
  },
};

export function mapOrderRow(order: AnyRecord): DataRow {
  const stops = asRecordArray(order.orderStops);
  const pickup = stops.find((stop) => stop.stopType === "PICKUP") ?? stops[0];
  const dropoff =
    stops.find((stop) => stop.stopType === "DROPOFF") ??
    stops[stops.length - 1];
  const assignment = asRecordArray(order.orderAssignments)[0];
  const customer = asRecord(order.customer);
  const customerUser = asRecord(customer?.user);
  const driver = asRecord(assignment?.driver);
  const driverUser = asRecord(driver?.user);
  const vehicleCategory = asRecord(order.vehicleCategory);
  const latestPayment = pickRelevantPayment(asRecordArray(order.payments));
  const orderStatus = getString(order, "status") ?? "--";
  const paymentStatus = getString(order, "paymentStatus") ?? "--";
  const paymentRecordStatus = getString(latestPayment, "status") ?? "";
  const paymentMethod = getString(latestPayment, "paymentMethod") ?? "";
  const customerName =
    getString(customer, "companyName") ??
    getString(customerUser, "fullName") ??
    "Cliente sin nombre";
  const driverName = getString(driverUser, "fullName") ?? "Sin asignar";

  return {
    id: getString(order, "orderCode") ?? getString(order, "id") ?? "--",
    _id: getString(order, "id") ?? "--",
    customerId: getString(customer, "id") ?? "",
    customerType: getString(customer, "customerType") ?? "",
    vehicleCategoryId: getString(order, "vehicleCategoryId") ?? "",
    cliente: customerName,
    origen:
      getString(pickup, "addressLine") ?? getString(pickup, "city") ?? "--",
    destino:
      getString(dropoff, "addressLine") ?? getString(dropoff, "city") ?? "--",
    servicio: getString(order, "serviceType") ?? "--",
    vehiculo: getString(vehicleCategory, "name") ?? "Sin categoría",
    conductor: driverName,
    estado: orderStatusLabel(orderStatus),
    estadoInterno: orderStatus,
    estadoPago: paymentStatusLabel(paymentStatus, paymentMethod),
    estadoPagoInterno: paymentStatus,
    eta: `${getNumber(order, "estimatedDurationMin") ?? "--"} min`,
    precio: getNumber(order, "totalAmount") ?? 0,
    recibo: getString(latestPayment, "providerReference") ?? "--",
    autorizacion: getString(latestPayment, "authorizationCode") ?? "--",
    tarjeta: getString(latestPayment, "maskedCardNumber") ?? "--",
    metodoPago: paymentMethod || "--",
    paymentProvider: getString(latestPayment, "paymentProvider") ?? "--",
    paymentRecordStatus,
    paymentId: getString(latestPayment, "id") ?? "",
    fecha: formatDateTime(getString(order, "createdAt")),
    prioridad: orderStatus === "PENDING_QUOTE" || orderStatus === "REQUESTED" ? "Alta" : "Normal",
    // Coordenadas de las paradas: permiten dibujar la orden en el mapa aunque
    // el conductor todavia no este transmitiendo GPS. 0 = sin dato.
    origenLat: getNumber(pickup, "latitude") ?? 0,
    origenLng: getNumber(pickup, "longitude") ?? 0,
    destinoLat: getNumber(dropoff, "latitude") ?? 0,
    destinoLng: getNumber(dropoff, "longitude") ?? 0,
  };
}

function pickRelevantPayment(payments: AnyRecord[]) {
  return (
    payments.find((payment) =>
      ["PAID", "AUTHORIZED"].includes(getString(payment, "status") ?? ""),
    ) ??
    payments.find((payment) =>
      ["PROCESSING", "PENDING"].includes(getString(payment, "status") ?? ""),
    ) ??
    payments[0]
  );
}

export function mapDriverRow(driver: AnyRecord): DataRow {
  const user = asRecord(driver.user);

  return {
    id: getString(driver, "id") ?? "--",
    userId: getString(driver, "userId") ?? "",
    licenseNumber: getString(driver, "licenseNumber") ?? "",
    licenseExpiration: dateInputValue(getString(driver, "licenseExpiration")),
    availabilityStatus: getString(driver, "availabilityStatus") ?? "",
    verificationStatus: getString(driver, "verificationStatus") ?? "",
    nombre: getString(user, "fullName") ?? "Usuario no encontrado",
    licencia: getString(driver, "licenseNumber") ?? "--",
    vencimiento: formatDate(getString(driver, "licenseExpiration")),
    verificacion: getString(driver, "verificationStatus") ?? "--",
    score: getNumber(driver, "ratingAVG") ?? 0,
    estado: getString(driver, "availabilityStatus") ?? "--",
  };
}

export function mapVehicleRow(vehicle: AnyRecord): DataRow {
  const vehicleCategory = asRecord(vehicle.vehicleCategory);

  return {
    id: getString(vehicle, "id") ?? "--",
    driverId: getString(vehicle, "driverId") ?? "",
    categoryId: getString(vehicle, "categoryId") ?? "",
    plateNumber: getString(vehicle, "plateNumber") ?? "",
    brand: getString(vehicle, "brand") ?? "",
    model: getString(vehicle, "model") ?? "",
    year: getNumber(vehicle, "year") ?? 0,
    color: getString(vehicle, "color") ?? "",
    status: getString(vehicle, "status") ?? "",
    placa: getString(vehicle, "plateNumber") ?? "--",
    tipo: getString(vehicleCategory, "name") ?? "Sin categoría",
    marca:
      `${getString(vehicle, "brand") ?? ""} ${getString(vehicle, "model") ?? ""}`.trim(),
    anio: getNumber(vehicle, "year") ?? "--",
    conductor: getString(vehicle, "driverId") ? "Asignado" : "Sin conductor",
    documentos: String(asRecordArray(vehicle.vehiclesDocuments).length),
    estado: getString(vehicle, "status") ?? "--",
  };
}

export function mapCustomerRow(customer: AnyRecord): DataRow {
  const user = asRecord(customer.user);
  const orders = asRecordArray(customer.transportOrders);
  const credit = asRecord(customer.creditAccount);
  const creditLimit = getNumber(credit, "creditLimit") ?? 0;
  const creditUsed = getNumber(credit, "balanceUsed") ?? 0;
  const creditAvailable = Math.max(0, creditLimit - creditUsed);
  const creditStatus = getString(credit, "status") ?? "Sin credito";

  return {
    id: getString(customer, "id") ?? "--",
    fullName: getString(user, "fullName") ?? "",
    email: getString(user, "email") ?? "",
    phone: getString(user, "phone") ?? "",
    customerType: getString(customer, "customerType") ?? "",
    documentType: getString(customer, "documentType") ?? "",
    documentNumber: getString(customer, "documentNumber") ?? "",
    companyName: getString(customer, "companyName") ?? "",
    billingEmail: getString(customer, "billingEmail") ?? "",
    creditLimit,
    creditUsed,
    creditAvailable,
    creditDays: getNumber(credit, "creditDays") ?? 15,
    creditStatus,
    creditNotes: getString(credit, "notes") ?? "",
    cliente:
      getString(customer, "companyName") ??
      getString(user, "fullName") ??
      getString(customer, "documentNumber") ??
      "--",
    tipo: getString(customer, "customerType") ?? "--",
    documento: getString(customer, "documentNumber") ?? "--",
    volumen: String(orders.length || "--"),
    cobro: creditStatus,
    creditoDisponible: creditLimit > 0 ? formatCurrency(creditAvailable) : "--",
    estado: getString(user, "status") ?? "ACTIVE",
  };
}

function orderStatusLabel(status: string) {
  if (["DRAFT", "PENDING_QUOTE", "PENDING_CUSTOMER_CONFIRMATION"].includes(status)) {
    return "Pendiente";
  }
  if (["PENDING_PAYMENT", "CONFIRMED"].includes(status)) {
    return "Aceptada";
  }
  if (["REQUESTED", "ASSIGNING_DRIVER"].includes(status)) {
    return "Pagada";
  }
  if (["ASSIGNED", "ACCEPTED"].includes(status)) {
    return "Conductor asignado";
  }
  if (status === "IN_PROGRESS") {
    return "En camino";
  }
  if (status === "DELIVERED") {
    return "Entregado";
  }
  if (status === "CANCELLED") {
    return "Cancelada";
  }
  if (status === "FAILED") {
    return "Fallida";
  }
  return status;
}

function paymentStatusLabel(status: string, method: string) {
  if (status === "PAID") {
    return "PAGADO";
  }
  if (status === "AUTHORIZED" && method === "CHECK") {
    return "CHEQUE_RECIBIDO";
  }
  if (status === "AUTHORIZED" && method === "CORPORATE_CREDIT") {
    return "CREDITO_APROBADO";
  }
  return status;
}

export function mapReservationRow(reservation: AnyRecord): DataRow {
  const order = asRecord(reservation.order);
  const customer = asRecord(order?.customer);
  const customerUser = asRecord(customer?.user);
  const category = asRecord(order?.vehicleCategory);

  return {
    id: getString(reservation, "id") ?? "--",
    orderId: getString(reservation, "orderId") ?? "--",
    orden:
      getString(order, "orderCode") ??
      getString(reservation, "orderId") ??
      "--",
    cliente:
      getString(customer, "companyName") ??
      getString(customerUser, "fullName") ??
      "--",
    reservado: formatDateTime(getString(reservation, "reservedFor")),
    reservedFor: getString(reservation, "reservedFor") ?? "",
    vehiculo: getString(category, "name") ?? "--",
    reprogramaciones: getNumber(reservation, "rescheduleCount") ?? 0,
    estado: getString(reservation, "reservationStatus") ?? "--",
  };
}

export function mapIncidentRow(incident: AnyRecord): DataRow {
  const order = asRecord(incident.order);

  return {
    id: getString(incident, "id") ?? "--",
    orderId: getString(incident, "orderId") ?? "--",
    orden:
      getString(order, "orderCode") ?? getString(incident, "orderId") ?? "--",
    titulo: getString(incident, "title") ?? "--",
    tipo: getString(incident, "incidentType") ?? "--",
    severidad: getString(incident, "severity") ?? "--",
    estado: getString(incident, "status") ?? "--",
    fecha: formatDateTime(getString(incident, "reportedAt")),
  };
}

export function mapRateCardRow(card: AnyRecord): DataRow {
  const rules = asRecordArray(card.rateRules);

  return {
    id: getString(card, "id") ?? "--",
    nombre: getString(card, "name") ?? "--",
    descripcion: getString(card, "description") ?? "--",
    vigencia: `${formatDate(getString(card, "validForm"))} - ${formatDate(getString(card, "validTo"))}`,
    reglas: String(rules.length),
    estado: getBoolean(card, "isActive") ? "ACTIVE" : "INACTIVE",
  };
}

export function mapRateRuleRow(
  rule: AnyRecord,
  categories: AnyRecord[] = [],
): DataRow {
  const vehicleCategoryId = getString(rule, "vehicleCategoryId");
  const category =
    asRecord(rule.vehicleCategory) ??
    categories.find((candidate) => String(candidate.id) === vehicleCategoryId);
  const categoryName = getString(category, "name");
  const categoryCode = getString(category, "code");

  return {
    id: getString(rule, "id") ?? "--",
    vehiculo: categoryName
      ? `${categoryName}${categoryCode ? ` · ${categoryCode}` : ""}`
      : (vehicleCategoryId ?? "--"),
    base: getNumber(rule, "baseFare") ?? 0,
    km: getNumber(rule, "pricePerKM") ?? 0,
    minuto: getNumber(rule, "pricePerMinute") ?? 0,
    minima: getNumber(rule, "minimumFare") ?? 0,
    ayudante: getNumber(rule, "helperFee") ?? 0,
    espera: getNumber(rule, "waitingPricePerMinute") ?? 0,
  };
}

export function mapDeliveryProofRow(proof: AnyRecord): DataRow {
  const order = asRecord(proof.order);

  return {
    id: getString(proof, "id") ?? "--",
    orden: getString(order, "orderCode") ?? getString(proof, "orderId") ?? "--",
    receptor: getString(proof, "recipientName") ?? "--",
    documento: getString(proof, "recipientDocument") ?? "--",
    tipo: getString(proof, "proofType") ?? "--",
    firmas: String(asRecordArray(proof.signatures).length),
    estado: getString(proof, "validationStatus") ?? "--",
    fecha: formatDateTime(getString(proof, "capturedAt")),
  };
}

export function mapAuditRow(log: AnyRecord): DataRow {
  const user = asRecord(log.user);

  return {
    id: getString(log, "id") ?? "--",
    hora: formatDateTime(getString(log, "createdAt")),
    actor:
      getString(user, "fullName") ?? getString(log, "actorUserId") ?? "Sistema",
    accion: getString(log, "action") ?? "--",
    entidad: getString(log, "entityType") ?? "--",
    entityId: getString(log, "entityId") ?? "--",
    ip: getString(log, "ipAddress") ?? "--",
  };
}

export function mapLiveLocation(location: AnyRecord): LiveLocation {
  return {
    id:
      getString(location, "id") ??
      `${getString(location, "orderId") ?? "order"}-${getString(location, "recordedAt") ?? Date.now()}`,
    driverId: getString(location, "driverId") ?? "",
    orderId: getString(location, "orderId") ?? "",
    latitude: getNumber(location, "latitude") ?? 0,
    longitude: getNumber(location, "longitude") ?? 0,
    accuracy: getNumber(location, "accuracy") ?? null,
    speed: getNumber(location, "speed") ?? null,
    batteryLevel: getNumber(location, "batteryLevel") ?? null,
    recordedAt: getString(location, "recordedAt") ?? new Date().toISOString(),
    receivedAt: getString(location, "receivedAt") ?? new Date().toISOString(),
  };
}

export function mapParameterRow(parameter: AnyRecord): DataRow {
  return {
    id: getString(parameter, "id") ?? getString(parameter, "key") ?? "--",
    clave: getString(parameter, "key") ?? "--",
    valor: getString(parameter, "value") ?? "--",
    tipo: getString(parameter, "valueType") ?? "--",
    descripcion: getString(parameter, "description") ?? "--",
    actualizado: formatDateTime(getString(parameter, "updatedAt")),
  };
}

export function mapCatalogRow(catalog: AnyRecord): DataRow {
  return {
    id: getString(catalog, "id") ?? "--",
    grupo: getString(catalog, "groupKey") ?? "--",
    codigo: getString(catalog, "code") ?? "--",
    etiqueta: getString(catalog, "label") ?? "--",
    orden: getNumber(catalog, "sortOrder") ?? 0,
    estado: getBoolean(catalog, "isActive") ? "ACTIVE" : "INACTIVE",
  };
}

export function mapUserRow(user: AnyRecord): DataRow {
  const roles = Array.isArray(user.roles)
    ? user.roles.map(String).join(", ")
    : "--";

  return {
    id: getString(user, "id") ?? "--",
    usuario: getString(user, "fullName") ?? "--",
    email: getString(user, "email") ?? "--",
    telefono: getString(user, "phone") ?? "--",
    roles,
    estado: getString(user, "status") ?? "--",
  };
}

async function getData<T>(endpoint: string, query?: QueryParams): Promise<T> {
  const response = await api.get<ApiResponse<T>>(endpoint, {
    params: cleanParams(query),
  });
  return unwrapApiResponse(response.data);
}

async function getList(
  endpoint: string,
  query?: QueryParams,
): Promise<AnyRecord[]> {
  const data = await getData<AnyRecord[] | { items: AnyRecord[] }>(
    endpoint,
    query,
  );
  return Array.isArray(data) ? data : (data.items ?? []);
}

async function postData(endpoint: string, payload: unknown) {
  const response = await api.post<ApiResponse<AnyRecord>>(endpoint, payload);
  return unwrapApiResponse(response.data);
}

async function putData(endpoint: string, payload: unknown) {
  const response = await api.put<ApiResponse<AnyRecord>>(endpoint, payload);
  return unwrapApiResponse(response.data);
}

async function patchData(endpoint: string, payload: unknown) {
  const response = await api.patch<ApiResponse<AnyRecord>>(endpoint, payload);
  return unwrapApiResponse(response.data);
}

async function deleteData(endpoint: string) {
  const response = await api.delete<ApiResponse<AnyRecord>>(endpoint);
  return unwrapApiResponse(response.data);
}

function cleanParams(query?: QueryParams) {
  if (!query) {
    return undefined;
  }

  return Object.fromEntries(
    Object.entries(query)
      .filter(
        ([, value]) => value !== undefined && value !== null && value !== "",
      )
      .map(([key, value]) => [
        key,
        value instanceof Date ? value.toISOString() : value,
      ]),
  );
}

function toNumber(value: string | number) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    throw new Error(`Valor numérico inválido: ${value}`);
  }

  return parsed;
}

function optionalNumber(value: string | number | undefined) {
  if (value === undefined || value === "") {
    return undefined;
  }

  return toNumber(value);
}

function optionalString(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function manualQuotePayload(values: Record<string, string>) {
  return {
    distanceKm: toNumber(values.distanceKm),
    estimatedDurationMin: values.estimatedDurationMin
      ? Math.round(toNumber(values.estimatedDurationMin))
      : undefined,
    helperRequired: values.itemRequireHelper === "true",
    tollAmount: optionalNumber(values.tollAmount),
    weightSurcharge: optionalNumber(values.weightSurcharge),
    volumeSurcharge: optionalNumber(values.volumeSurcharge),
    otherCharges: optionalNumber(values.otherCharges),
    discountAmount: optionalNumber(values.discountAmount),
    manualAdjustmentAmount: optionalNumber(values.manualAdjustmentAmount),
    adjustmentReason: optionalString(values.adjustmentReason),
  };
}

function toIso(value: string) {
  return new Date(value).toISOString();
}

function formatDate(value: string | undefined) {
  if (!value) {
    return "--";
  }

  return new Intl.DateTimeFormat("es-DO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function dateInputValue(value: string | undefined) {
  return value ? value.slice(0, 10) : "";
}

function formatDateTime(value: string | undefined) {
  if (!value) {
    return "--";
  }

  return new Intl.DateTimeFormat("es-DO", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-DO", {
    currency: "DOP",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

function asRecord(value: unknown): AnyRecord | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as AnyRecord)
    : undefined;
}

function asRecordArray(value: unknown): AnyRecord[] {
  return Array.isArray(value)
    ? value.filter((item): item is AnyRecord => Boolean(asRecord(item)))
    : [];
}

function getString(
  source: AnyRecord | undefined,
  key: string,
): string | undefined {
  const value = source?.[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function getNumber(
  source: AnyRecord | undefined,
  key: string,
): number | undefined {
  const value = source?.[key];
  const parsed =
    typeof value === "number" || typeof value === "string"
      ? Number(value)
      : Number.NaN;
  return Number.isFinite(parsed) ? parsed : undefined;
}

function getBoolean(source: AnyRecord | undefined, key: string): boolean {
  return source?.[key] === true;
}
