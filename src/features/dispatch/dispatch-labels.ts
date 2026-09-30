/** Textos en espanol para el ranking y las ofertas de despacho. */

export const exclusionLabels: Record<string, string> = {
  DRIVER_NOT_FOUND: "Perfil no encontrado",
  NOT_APPROVED: "Conductor no aprobado",
  NOT_AVAILABLE: "No esta disponible",
  LICENSE_EXPIRED: "Licencia vencida",
  NO_ACTIVE_VEHICLE_IN_CATEGORY: "Sin vehiculo activo de esta categoria",
  VEHICLE_DOCUMENTS_INVALID: "Documentos del vehiculo vencidos o rechazados",
  ACTIVE_TRIP: "Tiene un viaje activo",
  OFFER_PENDING_ELSEWHERE: "Tiene otra oferta pendiente",
  ALREADY_OFFERED: "Ya se le ofrecio esta orden",
  POSITION_STALE: "Ubicacion vencida",
  POSITION_LOW_ACCURACY: "Ubicacion imprecisa",
  NO_ROUTE_TO_PICKUP: "Sin ruta por carretera a la recogida",
  OUTSIDE_PRESELECTION: "Fuera de los mas cercanos",
};

export const alertLabels: Record<string, string> = {
  PRESENCE_DISABLED: "La ubicacion de conductores no esta activa (Redis apagado).",
  NO_CANDIDATES: "No hay conductores elegibles cerca de la recogida.",
  ROUTES_PROVIDER_FAILED: "Google Routes no respondio: el ETA no esta disponible.",
  CASCADE_EXHAUSTED: "Todos los conductores cercanos rechazaron o dejaron vencer la oferta.",
};

export const offerStatusLabels: Record<string, string> = {
  PENDING: "Esperando respuesta",
  ACCEPTED: "Aceptada",
  REJECTED: "Rechazada",
  EXPIRED: "Vencida",
  CANCELLED: "Cancelada",
};

/**
 * Mensajes del backend (ingles) que un operador puede ver al asignar.
 * Lo que no este aqui se muestra tal cual.
 */
const backendMessages: [RegExp, string][] = [
  [/must be paid or dispatch-authorized/i, "La orden debe estar pagada o autorizada antes de asignarla."],
  [/no longer available for assignment/i, "Otra persona o el despacho automatico ya asigno esta orden."],
  [/Driver is no longer available|Driver is not available/i, "El conductor ya no esta disponible."],
  [/already has an active trip/i, "El conductor tiene un viaje activo."],
  [/category does not match/i, "El vehiculo no es de la categoria de la orden."],
  [/Vehicle must be active/i, "El vehiculo no esta activo."],
  [/license is expired/i, "La licencia del conductor esta vencida."],
  [/must be approved/i, "El conductor aun no esta aprobado."],
  [/reason is required/i, "Indica el motivo al no elegir al primer candidato."],
  [/Driver is not eligible: (\w+)/i, "El conductor no es elegible"],
  [/no coordinates/i, "La recogida de esta orden no tiene coordenadas."],
];

export function dispatchErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  for (const [pattern, text] of backendMessages) {
    const match = message.match(pattern);
    if (match) {
      const reason = match[1] ? exclusionLabels[match[1]] : undefined;
      return reason ? `${text}: ${reason.toLowerCase()}.` : text;
    }
  }
  return message || "No se pudo asignar la orden";
}

export function formatEta(seconds: number | null | undefined): string {
  if (seconds == null) return "—";
  return `${Math.max(1, Math.round(seconds / 60))} min`;
}

export function formatMeters(meters: number | null | undefined): string {
  if (meters == null) return "—";
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`;
}

export function formatAge(seconds: number | null | undefined): string {
  if (seconds == null) return "sin posicion";
  if (seconds < 60) return `hace ${seconds} s`;
  return `hace ${Math.round(seconds / 60)} min`;
}
