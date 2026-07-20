import type { ModuleConfig } from "@/types/domain";

export const orderRows = [
  { id: "ORD-000124", cliente: "Santo Domingo Este", origen: "SDE", destino: "Distrito Nacional", servicio: "Inmediato", vehiculo: "Camión pequeño", conductor: "Juan Pérez", estado: "En ruta", eta: "24 min", precio: 1850, fecha: "20 Jul, 09:20", prioridad: "Alta" },
  { id: "ORD-000127", cliente: "Naco Market", origen: "Naco", destino: "Las Américas", servicio: "Programado", vehiculo: "Van de carga", conductor: "Sin asignar", estado: "Pendiente", eta: "--", precio: 2400, fecha: "20 Jul, 10:15", prioridad: "Media" },
  { id: "ORD-000131", cliente: "Villa Mella Supply", origen: "Villa Mella", destino: "Piantini", servicio: "Inmediato", vehiculo: "Motor carga", conductor: "Ana Rojas", estado: "En recogida", eta: "16 min", precio: 950, fecha: "20 Jul, 10:42", prioridad: "Normal" },
  { id: "ORD-000132", cliente: "Grupo Herrera", origen: "Herrera", destino: "Boca Chica", servicio: "Inmediato", vehiculo: "Camión mediano", conductor: "Carlos Díaz", estado: "Incidencia", eta: "42 min", precio: 3600, fecha: "20 Jul, 11:05", prioridad: "Crítica" },
  { id: "ORD-000135", cliente: "Farmacia Carol", origen: "Los Prados", destino: "Gazcue", servicio: "Programado", vehiculo: "Van de carga", conductor: "Marta Cruz", estado: "Entregada", eta: "0 min", precio: 1250, fecha: "20 Jul, 08:30", prioridad: "Normal" },
];

const commonOrderFields = [
  { name: "customerId", label: "ID del cliente", placeholder: "UUID del customer profile" },
  { name: "vehicleCategoryId", label: "ID categoría vehículo", placeholder: "UUID de categoría" },
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
      { key: "estado", label: "Estado", type: "status" }, { key: "eta", label: "ETA" }, { key: "precio", label: "Precio", type: "money" },
      { key: "prioridad", label: "Prioridad", type: "status" },
    ],
    rows: orderRows, fields: commonOrderFields,
    filters: ["Estado", "Fecha", "Prioridad", "Cliente", "Vehículo", "Conductor"],
  },
  drivers: {
    key: "drivers", title: "Conductores", subtitle: "Disponibilidad, seguridad y desempeño", action: "Nuevo conductor",
    stats: [
      { label: "Activos", value: "86", helper: "74 disponibles", tone: "green" }, { label: "En descanso", value: "14", helper: "Próximo turno 14:00", tone: "orange" },
      { label: "Incidentes", value: "2", helper: "Últimos 30 días", tone: "red" }, { label: "Calificación", value: "4.87", helper: "Promedio de flota", tone: "blue" },
    ],
    columns: [
      { key: "id", label: "ID", type: "strong" }, { key: "nombre", label: "Conductor", type: "strong" }, { key: "licencia", label: "Licencia" },
      { key: "zona", label: "Zona" }, { key: "turno", label: "Turno" }, { key: "score", label: "Score" }, { key: "estado", label: "Estado", type: "status" },
    ],
    rows: [
      { id: "DRV-047", nombre: "Rafael Peña", licencia: "D-4 · 2028", zona: "SDQ Norte", turno: "06:00–14:00", score: 97, estado: "Disponible" },
      { id: "DRV-052", nombre: "Ana Jiménez", licencia: "D-3 · 2027", zona: "Punta Cana", turno: "08:00–16:00", score: 91, estado: "En ruta" },
      { id: "DRV-061", nombre: "Luis Marte", licencia: "D-4 · 2029", zona: "Santiago", turno: "14:00–22:00", score: 78, estado: "Pausa" },
      { id: "DRV-073", nombre: "Carlos Díaz", licencia: "D-2 · 2027", zona: "La Vega", turno: "06:00–14:00", score: 84, estado: "Disponible" },
      { id: "DRV-084", nombre: "Marta Cruz", licencia: "D-3 · 2028", zona: "Bávaro", turno: "08:00–16:00", score: 88, estado: "Disponible" },
    ],
    filters: ["Estado", "Zona", "Licencia", "Score"],
    fields: [
      { name: "nombre", label: "Nombre completo" }, { name: "email", label: "Correo", type: "email" }, { name: "telefono", label: "Teléfono" },
      { name: "licencia", label: "Número de licencia" }, { name: "vencimiento", label: "Vencimiento", type: "date" }, { name: "zona", label: "Zona" },
    ],
  },
  vehicles: {
    key: "vehicles", title: "Vehículos", subtitle: "Estado de flota, mantenimiento y telemetría", action: "Nueva unidad",
    stats: [
      { label: "Disponibles", value: "58", helper: "78% de la flota", tone: "green" }, { label: "En taller", value: "7", helper: "3 salen hoy", tone: "red" },
      { label: "Utilización", value: "82%", helper: "+4% este mes", tone: "blue" }, { label: "Docs. por vencer", value: "4", helper: "Próximos 15 días", tone: "orange" },
    ],
    columns: [
      { key: "id", label: "Unidad", type: "strong" }, { key: "placa", label: "Placa", type: "strong" }, { key: "tipo", label: "Categoría" },
      { key: "marca", label: "Marca / modelo" }, { key: "km", label: "Kilometraje" }, { key: "proximo", label: "Próximo servicio" }, { key: "estado", label: "Estado", type: "status" },
    ],
    rows: [
      { id: "VH-104", placa: "L432118", tipo: "Furgón 53'", marca: "Freightliner M2", km: "182k", proximo: "1,200 km", estado: "Activa" },
      { id: "VH-118", placa: "L441072", tipo: "Reefer", marca: "International MV", km: "98k", proximo: "420 km", estado: "Atrasada" },
      { id: "VH-121", placa: "L438904", tipo: "Chasis", marca: "Hino 500", km: "210k", proximo: "3,400 km", estado: "Activa" },
      { id: "VH-127", placa: "L452201", tipo: "Furgón 26'", marca: "Isuzu NPR", km: "144k", proximo: "Taller", estado: "Mantenimiento" },
    ],
    filters: ["Estado", "Categoría", "Marca", "Documentos"],
    fields: [
      { name: "placa", label: "Placa" }, { name: "tipo", label: "Categoría", type: "select", options: ["Motor carga", "Van de carga", "Furgón 26'", "Furgón 53'", "Reefer"] },
      { name: "marca", label: "Marca" }, { name: "modelo", label: "Modelo" }, { name: "anio", label: "Año", type: "number" },
      { name: "capacidad", label: "Capacidad máxima" }, { name: "seguro", label: "Vencimiento del seguro", type: "date" },
    ],
  },
  customers: {
    key: "customers", title: "Clientes", subtitle: "Cartera, SLA y volumen por cuenta", action: "Nuevo cliente",
    stats: [
      { label: "Cuentas", value: "312", helper: "+18 este trimestre", tone: "slate" }, { label: "SLA en riesgo", value: "18", helper: "Requieren seguimiento", tone: "red" },
      { label: "Volumen mes", value: "8.4k", helper: "+12.4% vs. junio", tone: "blue" }, { label: "NPS", value: "72", helper: "Excelente", tone: "green" },
    ],
    columns: [
      { key: "id", label: "Cuenta", type: "strong" }, { key: "cliente", label: "Cliente", type: "strong" }, { key: "tipo", label: "Tipo" },
      { key: "volumen", label: "Volumen" }, { key: "sla", label: "SLA" }, { key: "cobro", label: "Cobro" }, { key: "estado", label: "Estado", type: "status" },
    ],
    rows: [
      { id: "CLI-1004", cliente: "Supermercados Nacional", tipo: "Empresa", volumen: "1.2k", sla: "96%", cobro: "OK", estado: "VIP" },
      { id: "CLI-1021", cliente: "Farmacia Carol", tipo: "Empresa", volumen: "940", sla: "92%", cobro: "OK", estado: "Confirmada" },
      { id: "CLI-1068", cliente: "Grupo Ramos", tipo: "Empresa", volumen: "1.8k", sla: "88%", cobro: "Revisión", estado: "Riesgo" },
      { id: "CLI-1083", cliente: "La Sirena", tipo: "Empresa", volumen: "1.5k", sla: "94%", cobro: "OK", estado: "VIP" },
      { id: "CLI-1102", cliente: "Plaza Lama", tipo: "Empresa", volumen: "620", sla: "91%", cobro: "OK", estado: "Confirmada" },
    ],
    filters: ["Tipo", "Ciudad", "Cobro", "Estado"],
    fields: [
      { name: "cliente", label: "Nombre o razón social" }, { name: "tipo", label: "Tipo", type: "select", options: ["Individual", "Empresa"] },
      { name: "documento", label: "Cédula / RNC" }, { name: "email", label: "Correo de facturación", type: "email" }, { name: "telefono", label: "Teléfono" },
      { name: "direccion", label: "Dirección principal", type: "textarea" },
    ],
  },
};
