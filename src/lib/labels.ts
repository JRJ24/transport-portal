/**
 * Etiquetas en espanol para todo enum que llega del API. Ninguna pantalla del
 * portal debe mostrar un codigo crudo (BUSINESS, CORPORATE_CREDIT...): usa
 * `label(kind, value)`, que devuelve el propio valor si aun no tiene texto.
 */

const orderStatus: Record<string, string> = {
  DRAFT: "Borrador",
  PENDING_QUOTE: "Pendiente de cotización",
  PENDING_CUSTOMER_CONFIRMATION: "Esperando confirmación del cliente",
  PENDING_PAYMENT: "Pendiente de pago",
  CONFIRMED: "Confirmada",
  REQUESTED: "Pagada · sin conductor",
  ASSIGNING_DRIVER: "Ofreciendo a conductor",
  ASSIGNED: "Asignada · por aceptar",
  ACCEPTED: "Conductor confirmado",
  IN_PROGRESS: "En camino",
  DELIVERED: "Entregada",
  CANCELLED: "Cancelada",
  FAILED: "Fallida",
};

const paymentStatus: Record<string, string> = {
  PENDING: "Pendiente",
  PROCESSING: "Procesando",
  AUTHORIZED: "Autorizado",
  PAID: "Pagado",
  FAILED: "Fallido",
  CANCELLED: "Cancelado",
  EXPIRED: "Vencido",
  REFUNDED: "Reembolsado",
};

const paymentMethod: Record<string, string> = {
  CARD: "Tarjeta",
  CASH: "Efectivo",
  TRANSFER: "Transferencia",
  CHECK: "Cheque",
  CORPORATE_CREDIT: "Crédito corporativo",
  WALLET: "Billetera",
};

const customerType: Record<string, string> = {
  INDIVIDUAL: "Personal",
  BUSINESS: "Empresa",
};

const documentType: Record<string, string> = {
  ID: "Cédula",
  RNC: "RNC",
  PASSPORT: "Pasaporte",
};

const creditStatus: Record<string, string> = {
  PENDING: "En revisión",
  ACTIVE: "Activo",
  BLOCKED: "Bloqueado",
  REJECTED: "Rechazado",
  CLOSED: "Cerrado",
};

const driverStatus: Record<string, string> = {
  AVAILABLE: "Disponible",
  BUSY: "En viaje",
  OFFLINE: "Desconectado",
  SUSPENDED: "Suspendido",
  VACATION: "Vacaciones",
};

const verificationStatus: Record<string, string> = {
  PENDING: "Pendiente",
  APPROVED: "Aprobado",
  REJECTED: "Rechazado",
};

const vehicleStatus: Record<string, string> = {
  ACTIVE: "Activo",
  MAINTENANCE: "En mantenimiento",
  INACTIVE: "Inactivo",
  SUSPENDED: "Suspendido",
};

const serviceType: Record<string, string> = {
  INMEDIATE: "Inmediato",
  SCHEDULED: "Programado",
};

const validationStatus: Record<string, string> = {
  PENDING: "Por revisar",
  VALIDATED: "Aprobada",
  REJECTED: "Rechazada",
};

const proofType: Record<string, string> = {
  PHOTO: "Foto",
  SIGNATURE: "Firma",
  MIXED: "Foto y firma",
  QR: "Código QR",
  CODE: "Código de entrega",
};

const accountStatus: Record<string, string> = {
  ACTIVE: "Activo",
  INACTIVE: "Inactivo",
  BLOCKED: "Bloqueado",
};

const role: Record<string, string> = {
  ADMIN: "Administrador",
  OPERATOR: "Operador",
  DRIVER: "Conductor",
  CUSTOMER: "Cliente",
};

const assignmentStatus: Record<string, string> = {
  PENDING: "Por aceptar",
  ACCEPTED: "Aceptada",
  REJECTED: "Rechazada",
  CANCELLED: "Cancelada",
  COMPLETED: "Completada",
};

const reservationStatus: Record<string, string> = {
  ACTIVE: "Activa",
  RESCHUDULED: "Reprogramada",
  CANCELLED: "Cancelada",
  EXPIRED: "Vencida",
  COMPLETED: "Completada",
};

const incidentStatus: Record<string, string> = {
  OPEN: "Abierta",
  IN_REVIEW: "En revisión",
  RESOLVED: "Resuelta",
  CLOSED: "Cerrada",
};

const incidentSeverity: Record<string, string> = {
  LOW: "Baja",
  MEDIUM: "Media",
  HIGH: "Alta",
  CRITICAL: "Crítica",
};

const incidentType: Record<string, string> = {
  DELAY: "Retraso",
  DAMAGE: "Daño a la carga",
  CUSTOMER_ABSENT: "Cliente ausente",
  WRONG_ADDRESS: "Dirección incorrecta",
  VEHICLE_PROBLEM: "Problema con el vehículo",
  OTHER: "Otro",
};

/** Acciones que escribe el backend en AuditLog (grep `action:` en transport-api). */
const auditAction: Record<string, string> = {
  CUSTOMER_CREATED_FAST: "Cliente creado desde el TMS",
  CUSTOMER_UPDATED_TMS: "Cliente actualizado desde el TMS",
  CUSTOMER_SOFT_DELETED: "Cliente desactivado",
  CUSTOMER_CREDIT_UPDATED: "Crédito corporativo actualizado",
  CUSTOMER_CREDIT_REQUESTED: "Crédito corporativo solicitado",
  CUSTOMER_CREDIT_INCREASE_REQUESTED: "Aumento de crédito solicitado",
  DRIVER_UPDATED: "Conductor actualizado",
  DRIVER_SOFT_DELETED: "Conductor desactivado",
  VEHICLE_SOFT_DELETED: "Vehículo desactivado",
  ORDER_SOFT_DELETED: "Orden eliminada",
  PUBLIC_QUOTE_LEAD_CREATED: "Cotización web recibida",
  RESERVATION_RESCHEDULED: "Reserva reprogramada",
  RESERVATION_SOFT_DELETED: "Reserva eliminada",
  USER_PASSWORD_CHANGED: "Contraseña cambiada",
  USER_EMAIL_CHANGED: "Correo de acceso cambiado",
  SYSTEM_PARAMETER_UPDATED: "Parámetro del sistema actualizado",
  "auth.login": "Inicio de sesión",
  "auth.login_failed": "Intento de inicio de sesión fallido",
  "auth.register": "Registro de cuenta",
  "auth.refresh_reuse_detected": "Reutilización de sesión bloqueada",
  "auth.logout": "Cierre de sesión",
  "auth.logout_all": "Cierre de sesión en todos los dispositivos",
  DELIVERY_PROOF_REVIEWED: "Evidencia revisada",
};

const auditEntity: Record<string, string> = {
  CUSTOMER: "Cliente",
  DRIVER: "Conductor",
  VEHICLE: "Vehículo",
  ORDER: "Orden",
  RESERVATION: "Reserva",
  USER: "Usuario",
  USERSESSION: "Sesión",
  DELIVERYPROOF: "Evidencia",
  SYSTEM_PARAMETER: "Parámetro",
  RATE_CARD: "Tarifa",
};

const tables = {
  orderStatus,
  paymentStatus,
  paymentMethod,
  customerType,
  documentType,
  creditStatus,
  driverStatus,
  verificationStatus,
  vehicleStatus,
  serviceType,
  validationStatus,
  proofType,
  accountStatus,
  role,
  assignmentStatus,
  reservationStatus,
  incidentStatus,
  incidentSeverity,
  incidentType,
  auditAction,
  auditEntity,
} as const;

export type LabelKind = keyof typeof tables;

export function label(kind: LabelKind, value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  const raw = String(value);
  const table: Record<string, string> = tables[kind];
  // Las entidades de auditoria llegan con mayusculas mezcladas (User, USER).
  const key = kind === "auditEntity" ? raw.toUpperCase() : raw;
  return table[key] ?? table[raw] ?? humanize(raw);
}

/**
 * Traduce un valor suelto de un JSON (auditoria) buscando en las tablas de
 * estados. Si el campo dice de que tipo es, esa tabla gana.
 */
export function labelValue(field: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Sí" : "No";
  if (typeof value !== "string") return typeof value === "object" ? JSON.stringify(value) : String(value);
  const hint: LabelKind | undefined = /payment.*method|metodo/i.test(field)
    ? "paymentMethod"
    : /payment/i.test(field)
      ? "paymentStatus"
      : /availability/i.test(field)
        ? "driverStatus"
        : /verification/i.test(field)
          ? "verificationStatus"
          : /customerType/i.test(field)
            ? "customerType"
            : /credit/i.test(field) && /status/i.test(field)
              ? "creditStatus"
              : /validation/i.test(field)
                ? "validationStatus"
                : undefined;
  if (hint && (tables[hint] as Record<string, string>)[value]) return (tables[hint] as Record<string, string>)[value];
  for (const kind of ["orderStatus", "accountStatus", "vehicleStatus", "role", "documentType"] as LabelKind[]) {
    const text = (tables[kind] as Record<string, string>)[value];
    if (text) return text;
  }
  return value;
}

/** Nombre legible de un campo de un JSON de auditoria. */
export function labelField(field: string): string {
  return fieldNames[field] ?? field.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
}

const fieldNames: Record<string, string> = {
  availabilityStatus: "Disponibilidad",
  verificationStatus: "Verificación",
  status: "Estado",
  userStatus: "Estado del usuario",
  creditLimit: "Límite de crédito",
  requestedLimit: "Límite solicitado",
  creditDays: "Días de crédito",
  balanceUsed: "Balance usado",
  customerType: "Tipo de cliente",
  documentType: "Tipo de documento",
  documentNumber: "Documento",
  companyName: "Razón social",
  billingEmail: "Correo de facturación",
  fullName: "Nombre",
  email: "Correo",
  phone: "Teléfono",
  previous: "Anterior",
  next: "Nuevo",
  revokedSessions: "Sesiones cerradas",
  validationStatus: "Estado de revisión",
  reason: "Motivo",
  reservedFor: "Reservado para",
  plateNumber: "Placa",
  key: "Parámetro",
  value: "Valor",
};

/** Opciones {value,label} para selects y filtros. */
export function labelOptions(kind: LabelKind): { value: string; label: string }[] {
  return Object.entries(tables[kind] as Record<string, string>).map(([value, text]) => ({ value, label: text }));
}

/** Ultimo recurso para un codigo sin traducir: CODIGO_EN_MAYUSCULAS → "Codigo en mayusculas". */
function humanize(value: string): string {
  if (!/^[A-Z0-9_.]+$/i.test(value) || !/[_.]/.test(value)) return value;
  const text = value.replace(/[_.]+/g, " ").toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}
