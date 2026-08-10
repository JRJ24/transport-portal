import type { ModuleConfig } from "@/types/domain";

const commonOrderFields = [
  { name: "estadoInterno", label: "Estado", type: "select" as const, options: ["DRAFT", "PENDING_QUOTE", "PENDING_CUSTOMER_CONFIRMATION", "PENDING_PAYMENT", "CONFIRMED", "ASSIGNING_DRIVER", "REQUESTED", "ASSIGNED", "ACCEPTED", "IN_PROGRESS", "DELIVERED", "CANCELLED", "FAILED"] },
  { name: "customerId", label: "Cliente", type: "select" as const, options: [] },
  { name: "vehicleCategoryId", label: "Categoría de vehículo", type: "select" as const, options: [] },
  { name: "serviceType", label: "Tipo de servicio", type: "select" as const, options: ["INMEDIATE", "SCHEDULED"] },
  { name: "scheduleAt", label: "Fecha programada", type: "date" as const, required: false },
  { name: "originContactName", label: "Contacto origen", placeholder: "Nombre" },
  { name: "originContactPhone", label: "Teléfono origen", placeholder: "+18095551234" },
  { name: "originAddress", label: "Dirección origen", placeholder: "Dirección de recogida" },
  { name: "originCity", label: "Ciudad origen", placeholder: "Santo Domingo" },
  { name: "originProvince", label: "Provincia origen", placeholder: "Distrito Nacional" },
  { name: "originLatitude", label: "Latitud origen", type: "number" as const, placeholder: "18.4861" },
  { name: "originLongitude", label: "Longitud origen", type: "number" as const, placeholder: "-69.9312" },
  { name: "destinationContactName", label: "Contacto destino", placeholder: "Nombre" },
  { name: "destinationContactPhone", label: "Teléfono destino", placeholder: "+18095551234" },
  { name: "destinationAddress", label: "Dirección destino", placeholder: "Dirección de entrega" },
  { name: "destinationCity", label: "Ciudad destino", placeholder: "Santo Domingo" },
  { name: "destinationProvince", label: "Provincia destino", placeholder: "Distrito Nacional" },
  { name: "destinationLatitude", label: "Latitud destino", type: "number" as const, placeholder: "18.4701" },
  { name: "destinationLongitude", label: "Longitud destino", type: "number" as const, placeholder: "-69.9022" },
  { name: "distanceKm", label: "Distancia km", type: "number" as const, placeholder: "12.4" },
  { name: "estimatedDurationMin", label: "Duración estimada min", type: "number" as const, placeholder: "32" },
  { name: "totalAmount", label: "Monto total RD$", type: "number" as const, placeholder: "1850" },
  { name: "itemDescription", label: "Descripción carga", placeholder: "Caja mediana" },
  { name: "itemQuantity", label: "Cantidad", type: "number" as const, placeholder: "1" },
  { name: "itemWeightKg", label: "Peso kg", type: "number" as const, placeholder: "12.5" },
  { name: "itemVolumeM3", label: "Volumen m3", type: "number" as const, required: false },
  { name: "itemDeclaredValue", label: "Valor declarado", type: "number" as const, required: false },
  { name: "itemFragile", label: "Frágil", type: "select" as const, options: ["false", "true"], required: false },
  { name: "itemRequireHelper", label: "Requiere ayudante", type: "select" as const, options: ["false", "true"], required: false },
  { name: "notes", label: "Notas e instrucciones", type: "textarea" as const, placeholder: "Detalles de carga, contacto y acceso", required: false },
];

export const moduleConfigs: Partial<Record<string, ModuleConfig>> = {
  orders: {
    key: "orders", title: "Órdenes", subtitle: "Despacho, prioridad y SLA por orden", action: "Nueva orden",
    stats: [
      { label: "En ruta", value: "128", helper: "+8.2% esta semana", tone: "blue" },
      { label: "Atrasadas", value: "9", helper: "2 requieren atención", tone: "red" },
      { label: "SLA", value: "94.6%", helper: "+1.4% vs. junio", tone: "green" },
      { label: "Costo / km", value: "RD$41", helper: "Promedio operativo", tone: "slate" },
    ],
    columns: [
      { key: "id", label: "Orden", type: "strong" }, { key: "cliente", label: "Cliente" }, { key: "origen", label: "Origen" },
      { key: "destino", label: "Destino" }, { key: "servicio", label: "Servicio" }, { key: "conductor", label: "Conductor" },
      { key: "estado", label: "Estado", type: "status" }, { key: "estadoPago", label: "Pago", type: "status" }, { key: "eta", label: "ETA" }, { key: "precio", label: "Precio", type: "money" },
      { key: "prioridad", label: "Prioridad", type: "status" },
    ],
    rows: [], fields: commonOrderFields,
    filters: [
      { label: "Estado", name: "status", options: ["DRAFT", "PENDING_QUOTE", "PENDING_CUSTOMER_CONFIRMATION", "PENDING_PAYMENT", "REQUESTED", "ASSIGNED", "ACCEPTED", "IN_PROGRESS", "DELIVERED", "CANCELLED", "FAILED"].map((value) => ({ label: value, value })) },
      { label: "Servicio", name: "serviceType", options: ["INMEDIATE", "SCHEDULED"].map((value) => ({ label: value, value })) },
    ],
  },
  drivers: {
    key: "drivers", title: "Conductores", subtitle: "Aprobacion, disponibilidad y desempeño", action: "Nuevo conductor",
    stats: [
      { label: "Activos", value: "86", helper: "74 disponibles", tone: "green" }, { label: "En descanso", value: "14", helper: "Próximo turno 14:00", tone: "orange" },
      { label: "Incidentes", value: "2", helper: "Últimos 30 días", tone: "red" }, { label: "Calificación", value: "4.87", helper: "Promedio de flota", tone: "blue" },
    ],
    columns: [
      { key: "nombre", label: "Conductor", type: "strong" }, { key: "licencia", label: "Licencia" },
      { key: "vencimiento", label: "Vencimiento" }, { key: "verificacion", label: "Verificación", type: "status" }, { key: "score", label: "Score" }, { key: "estado", label: "Estado", type: "status" },
    ],
    rows: [],
    filters: [
      { label: "Estado", name: "availabilityStatus", options: ["AVAILABLE", "BUSY", "OFFLINE", "SUSPENDED", "VACATION"].map((value) => ({ label: value, value })) },
      { label: "Verificación", name: "verificationStatus", options: ["PENDING", "APPROVED", "REJECTED"].map((value) => ({ label: value, value })) },
    ],
    fields: [
      { name: "userId", label: "Usuario conductor", type: "select", options: [] }, { name: "licenseNumber", label: "Número de licencia" }, { name: "licenseExpiration", label: "Vencimiento", type: "date" },
      { name: "availabilityStatus", label: "Estado", type: "select", options: ["AVAILABLE", "BUSY", "OFFLINE", "SUSPENDED", "VACATION"], required: false },
      { name: "verificationStatus", label: "Verificación", type: "select", options: ["PENDING", "APPROVED", "REJECTED"], required: false },
    ],
  },
  vehicles: {
    key: "vehicles", title: "Vehículos", subtitle: "Estado de flota, mantenimiento y telemetría", action: "Nueva unidad",
    stats: [
      { label: "Disponibles", value: "58", helper: "78% de la flota", tone: "green" }, { label: "En taller", value: "7", helper: "3 salen hoy", tone: "red" },
      { label: "Utilización", value: "82%", helper: "+4% este mes", tone: "blue" }, { label: "Docs. por vencer", value: "4", helper: "Próximos 15 días", tone: "orange" },
    ],
    columns: [
      { key: "placa", label: "Unidad", type: "strong" }, { key: "tipo", label: "Categoría" },
      { key: "marca", label: "Marca / modelo" }, { key: "anio", label: "Año" }, { key: "documentos", label: "Docs." }, { key: "estado", label: "Estado", type: "status" },
    ],
    rows: [],
    filters: [
      { label: "Estado", name: "status", options: ["ACTIVE", "MAINTENANCE", "INACTIVE", "SUSPENDED"].map((value) => ({ label: value, value })) },
    ],
    fields: [
      { name: "driverId", label: "Conductor", type: "select", options: [] }, { name: "categoryId", label: "Categoría", type: "select", options: [] }, { name: "plateNumber", label: "Placa" },
      { name: "brand", label: "Marca" }, { name: "model", label: "Modelo" }, { name: "year", label: "Año", type: "number" },
      { name: "color", label: "Color" }, { name: "status", label: "Estado", type: "select", options: ["ACTIVE", "MAINTENANCE", "INACTIVE", "SUSPENDED"], required: false },
    ],
  },
  customers: {
    key: "customers", title: "Clientes", subtitle: "Cartera, SLA y volumen por cuenta", action: "Nuevo cliente",
    stats: [
      { label: "Cuentas", value: "312", helper: "+18 este trimestre", tone: "slate" }, { label: "SLA en riesgo", value: "18", helper: "Requieren seguimiento", tone: "red" },
      { label: "Volumen mes", value: "8.4k", helper: "+12.4% vs. junio", tone: "blue" }, { label: "NPS", value: "72", helper: "Excelente", tone: "green" },
    ],
    columns: [
      { key: "cliente", label: "Cuenta", type: "strong" }, { key: "tipo", label: "Tipo" },
      { key: "documento", label: "Documento" }, { key: "volumen", label: "Volumen" }, { key: "cobro", label: "Credito", type: "status" }, { key: "estado", label: "Estado", type: "status" },
    ],
    rows: [],
    filters: [
      { label: "Tipo", name: "customerType", options: ["INDIVIDUAL", "BUSINESS"].map((value) => ({ label: value, value })) },
      { label: "Estado", name: "status", options: ["ACTIVE", "INACTIVE", "BLOCKED"].map((value) => ({ label: value, value })) },
    ],
    fields: [
      { name: "fullName", label: "Nombre completo" },
      { name: "email", label: "Correo", type: "email" },
      { name: "phone", label: "Teléfono" },
      { name: "customerType", label: "Tipo", type: "select", options: ["INDIVIDUAL", "BUSINESS"] },
      { name: "documentType", label: "Documento", type: "select", options: ["ID", "RNC", "PASSPORT"] },
      { name: "documentNumber", label: "Número documento" },
      { name: "companyName", label: "Empresa", required: false },
      { name: "billingEmail", label: "Correo facturación", type: "email", required: false },
    ],
  },
};
