import { labelOptions } from "@/lib/labels";
import type { ModuleConfig } from "@/types/domain";

const commonOrderFields = [
  { name: "estadoInterno", label: "Estado", type: "select" as const, options: labelOptions("orderStatus") },
  { name: "customerId", label: "Cliente", type: "select" as const, options: [] },
  { name: "vehicleCategoryId", label: "Categoría de vehículo", type: "select" as const, options: [] },
  { name: "serviceType", label: "Tipo de servicio", type: "select" as const, options: labelOptions("serviceType") },
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
  { name: "totalAmount", label: "Monto total RD$", type: "money" as const, placeholder: "1850.40" },
  { name: "itemDescription", label: "Descripción carga", placeholder: "Caja mediana" },
  { name: "itemQuantity", label: "Cantidad", type: "number" as const, placeholder: "1" },
  { name: "itemWeightKg", label: "Peso kg", type: "number" as const, placeholder: "12.5" },
  { name: "itemVolumeM3", label: "Volumen m3", type: "number" as const, required: false },
  { name: "itemDeclaredValue", label: "Valor declarado", type: "money" as const, required: false },
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
      { key: "estado", label: "Estado", type: "status" }, { key: "estadoPago", label: "Pago", type: "status" }, { key: "metodoPago", label: "Método" }, { key: "eta", label: "Duración" }, { key: "precio", label: "Precio", type: "money" },
    ],
    rows: [], fields: commonOrderFields,
    filters: [
      { label: "Estado", name: "status", options: labelOptions("orderStatus") },
      { label: "Servicio", name: "serviceType", options: labelOptions("serviceType") },
    ],
    detailFields: [
      { key: "id", label: "Código", section: "Resumen" },
      { key: "estado", label: "Estado", type: "status", section: "Resumen" },
      { key: "servicio", label: "Servicio", section: "Resumen" },
      { key: "vehiculo", label: "Vehículo", section: "Resumen" },
      { key: "fecha", label: "Creada", section: "Resumen" },
      { key: "cliente", label: "Cliente", section: "Cliente" },
      { key: "tipoCliente", label: "Tipo de cliente", section: "Cliente" },
      { key: "origen", label: "Recogida", section: "Ruta" },
      { key: "destino", label: "Entrega", section: "Ruta" },
      { key: "distancia", label: "Distancia", section: "Ruta" },
      { key: "eta", label: "Duración estimada", section: "Ruta" },
      { key: "precio", label: "Total", type: "money", section: "Pago" },
      { key: "estadoPago", label: "Estado del pago", type: "status", section: "Pago" },
      { key: "metodoPago", label: "Método", section: "Pago" },
      { key: "recibo", label: "Referencia", section: "Pago" },
      { key: "autorizacion", label: "Autorización", section: "Pago" },
      { key: "tarjeta", label: "Tarjeta", section: "Pago" },
      { key: "conductor", label: "Conductor", section: "Conductor" },
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
      { label: "Estado", name: "availabilityStatus", options: labelOptions("driverStatus") },
      { label: "Verificación", name: "verificationStatus", options: labelOptions("verificationStatus") },
    ],
    fields: [
      { name: "userId", label: "Usuario conductor", type: "select", options: [] }, { name: "licenseNumber", label: "Número de licencia" }, { name: "licenseExpiration", label: "Vencimiento", type: "date" },
      { name: "availabilityStatus", label: "Estado", type: "select", options: labelOptions("driverStatus"), required: false },
      { name: "verificationStatus", label: "Verificación", type: "select", options: labelOptions("verificationStatus"), required: false },
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
      { label: "Estado", name: "status", options: labelOptions("vehicleStatus") },
    ],
    fields: [
      { name: "driverId", label: "Conductor", type: "select", options: [] }, { name: "categoryId", label: "Categoría", type: "select", options: [] }, { name: "plateNumber", label: "Placa" },
      { name: "brand", label: "Marca" }, { name: "model", label: "Modelo" }, { name: "year", label: "Año", type: "number" },
      { name: "color", label: "Color" }, { name: "status", label: "Estado", type: "select", options: labelOptions("vehicleStatus"), required: false },
    ],
  },
  customers: {
    key: "customers", title: "Clientes", subtitle: "Cartera, SLA y volumen por cuenta", action: "Nuevo cliente",
    stats: [

    ],
    columns: [
      { key: "cliente", label: "Cuenta", type: "strong" }, { key: "tipo", label: "Tipo" },
      { key: "documento", label: "Documento" }, { key: "volumen", label: "Volumen" }, { key: "cobro", label: "Credito", type: "status" }, { key: "creditoDisponible", label: "Disponible" }, { key: "estado", label: "Estado", type: "status" },
    ],
    rows: [],
    filters: [
      { label: "Tipo", name: "customerType", options: labelOptions("customerType") },
      { label: "Estado", name: "status", options: labelOptions("accountStatus") },
    ],
    fields: [
      { name: "fullName", label: "Nombre completo" },
      { name: "email", label: "Correo", type: "email" },
      { name: "phone", label: "Teléfono" },
      { name: "customerType", label: "Tipo", type: "select", options: labelOptions("customerType") },
      { name: "documentType", label: "Documento", type: "select", options: labelOptions("documentType") },
      { name: "documentNumber", label: "Número documento" },
      { name: "companyName", label: "Empresa", required: false },
      { name: "billingEmail", label: "Correo facturación", type: "email", required: false },
    ],
  },
};
