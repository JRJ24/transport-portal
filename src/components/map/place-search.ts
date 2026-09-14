import type { LatLngLiteral } from "@/config/maps.config";
import { tmsService } from "@/services/tms.service";

/**
 * Frontera con el backend para el buscador de direcciones.
 *
 * Normaliza aqui las trampas del contrato para que el componente nunca las
 * vea: `mainText`/`secondaryText` son claves OMITIDAS cuando Google no las
 * devuelve, y `sessionToken: null` falla la validacion `@IsString()`.
 */

export interface PlaceHit {
  placeId: string;
  /** Linea principal. Nunca vacia: cae a `text`. */
  mainText: string;
  /** Linea secundaria (sector, municipio). Puede ser "". */
  secondaryText: string;
  /** Texto completo, el que se escribe en el input al seleccionar. */
  text: string;
}

export interface PlaceSearchResult {
  hits: PlaceHit[];
  /** El backend no tiene Places real: las coordenadas serian siempre Santo Domingo. */
  mock: boolean;
}

export interface PlaceResolution {
  placeId: string;
  formattedAddress: string;
  point: LatLngLiteral | null;
  mock: boolean;
}

/** Radio del sesgo de resultados, dentro del rango que acepta la API (100-50000). */
const BIAS_RADIUS_METERS = 50_000;
/** Tope del campo `input` en el DTO. */
const MAX_INPUT_LENGTH = 180;

/**
 * Token de sesion de Places.
 *
 * Google agrupa la facturacion de autocomplete + details cuando comparten
 * token. `crypto.randomUUID` no existe fuera de contexto seguro (desarrollo
 * por IP de LAN en HTTP), de ahi el respaldo.
 */
export function newPlaceSessionToken() {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function searchPlaces({
  bias,
  sessionToken,
  signal,
  term,
}: {
  bias: LatLngLiteral | null;
  sessionToken: string;
  signal: AbortSignal;
  term: string;
}): Promise<PlaceSearchResult> {
  const result = await tmsService.autocompletePlaces(
    {
      input: term.slice(0, MAX_INPUT_LENGTH),
      sessionToken,
      // `radiusMeters` solo tiene efecto acompanado de `locationBias`.
      ...(bias
        ? {
            locationBias: { latitude: bias.lat, longitude: bias.lng },
            radiusMeters: BIAS_RADIUS_METERS,
          }
        : {}),
    },
    signal,
  );

  return {
    hits: result.suggestions.map((suggestion) => ({
      placeId: suggestion.placeId,
      mainText: suggestion.mainText ?? suggestion.text,
      secondaryText: suggestion.secondaryText ?? "",
      text: suggestion.text,
    })),
    mock: result.provider === "internal-mock",
  };
}

export async function resolvePlace({
  placeId,
  sessionToken,
}: {
  placeId: string;
  sessionToken: string | null;
}): Promise<PlaceResolution> {
  const details = await tmsService.placeDetails(placeId, sessionToken ?? undefined);

  return {
    placeId: details.placeId,
    formattedAddress: details.formattedAddress,
    point:
      details.latitude !== null && details.longitude !== null
        ? { lat: details.latitude, lng: details.longitude }
        : null,
    mock: details.provider === "internal-mock" || placeId.startsWith("mock:"),
  };
}
