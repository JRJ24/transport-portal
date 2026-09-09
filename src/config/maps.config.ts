/**
 * Punto unico de configuracion de Google Maps para el portal.
 *
 * Todo lo que antes estaba repartido por `LiveMap`, `MapPage` y el CSS
 * (clave, centro por defecto, zoom, colores de marcador) vive aqui.
 */

export interface LatLngLiteral {
  lat: number;
  lng: number;
}

/** Clave browser inyectada por Docker/Vite. Ver `src/vite-env.d.ts`. */
export const googleMapsApiKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? "").trim();

/** Map ID opcional. Vacio = marcadores clasicos, sin estilos de nube. */
export const googleMapsMapId = (import.meta.env.VITE_GOOGLE_MAPS_MAP_ID ?? "").trim();

export const hasGoogleMapsKey = googleMapsApiKey.length > 0;
export const hasGoogleMapsMapId = googleMapsMapId.length > 0;

/** Idioma y region de las etiquetas del mapa y de los resultados de Places. */
export const MAPS_LANGUAGE = "es";
export const MAPS_REGION = "DO";

/** Librerias que el portal necesita cargar junto al script base. */
export const MAPS_LIBRARIES = ["marker"];

/** Centro por defecto: Santo Domingo, Distrito Nacional. */
export const DEFAULT_CENTER: LatLngLiteral = { lat: 18.4861, lng: -69.9312 };

/** Zoom del mapa completo cuando todavia no hay puntos que encuadrar. */
export const DEFAULT_ZOOM = 12;
/** Zoom del mapa compacto del dashboard. */
export const COMPACT_ZOOM = 11;
/** Zoom al seguir una sola unidad. */
export const FOCUS_ZOOM = 15;
/** Tope de acercamiento del auto-encuadre (evita el zoom 21 con un solo punto). */
export const MAX_FIT_ZOOM = 16;
/** Margen en px que deja el auto-encuadre alrededor de los marcadores. */
export const FIT_PADDING = 56;

/** Recuadro de Republica Dominicana: sesga Places y limita el paneo. */
export const DOMINICAN_REPUBLIC_BOUNDS = {
  north: 19.98,
  south: 17.36,
  east: -68.19,
  west: -72.05,
};

/**
 * Ids de instancia de mapa.
 *
 * `<Map id>` es obligatorio cuando hay mas de un mapa bajo el mismo
 * `APIProvider`, y es lo que permite a los controles externos alcanzar la
 * instancia con `useMap(id)`.
 */
export const MAP_INSTANCE_IDS = {
  dashboard: "dashboard-live-map",
  fleet: "fleet-live-map",
} as const;

/** Paleta de marcadores por tipo de punto. */
export const MAP_TONES = {
  driver: { color: "#2463eb", glyph: "", label: "Conductor" },
  pickup: { color: "#0fa654", glyph: "A", label: "Recogida" },
  dropoff: { color: "#f39a0b", glyph: "B", label: "Entrega" },
  stop: { color: "#64748b", glyph: "•", label: "Parada" },
  alert: { color: "#dc2626", glyph: "!", label: "Incidencia" },
} as const;

export type MapTone = keyof typeof MAP_TONES;

/**
 * Mensajes de diagnostico.
 *
 * Google no expone el codigo exacto (`BillingNotEnabledMapError`,
 * `InvalidKeyMapError`, `RefererNotAllowedMapError`) al codigo de la pagina:
 * solo lo escribe en consola e invoca `gm_authFailure`. Por eso el overlay
 * enumera las tres causas reales en vez de adivinar una.
 */
export const MAPS_DIAGNOSTICS = {
  missingKey: {
    title: "Google Maps no está configurado",
    detail: "Define PORTAL_VITE_GOOGLE_MAPS_API_KEY y reconstruye el contenedor del portal.",
  },
  authFailure: {
    title: "Google Maps rechazó la clave",
    detail: "El script cargó pero la autorización falló. Revisa en Google Cloud, en este orden:",
    checklist: [
      "Cuenta de facturación vinculada al proyecto (BillingNotEnabledMapError).",
      "API «Maps JavaScript API» habilitada (ApiNotActivatedMapError).",
      "Dominio del portal en los referentes HTTP de la clave (RefererNotAllowedMapError).",
    ],
  },
  loadFailure: {
    title: "No se pudo cargar Google Maps",
    detail: "El navegador no alcanzó maps.googleapis.com. Revisa red, proxy o bloqueadores.",
  },
} as const;
