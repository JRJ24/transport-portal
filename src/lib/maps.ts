import { DEFAULT_CENTER, type LatLngLiteral, type MapTone } from "@/config/maps.config";
import type { DataRow } from "@/types/domain";

/** Cualquier objeto de la API con coordenadas (paradas, ubicaciones GPS). */
export interface GeoPoint {
  latitude?: number | string | null;
  longitude?: number | string | null;
}

export interface LatLngBoundsLiteral {
  north: number;
  south: number;
  east: number;
  west: number;
}

/** Descarta 0/0, NaN y coordenadas fuera de rango (la API devuelve 0 cuando falta el dato). */
export function isUsableLatLng(lat: number, lng: number) {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180 &&
    !(lat === 0 && lng === 0)
  );
}

/** Normaliza `{latitude, longitude}` (API) a `{lat, lng}` (Google Maps). */
export function toLatLng(point?: GeoPoint | null): LatLngLiteral | null {
  if (!point) {
    return null;
  }

  const lat = Number(point.latitude);
  const lng = Number(point.longitude);
  return isUsableLatLng(lat, lng) ? { lat, lng } : null;
}

export function toLatLngList(points: (GeoPoint | null | undefined)[]): LatLngLiteral[] {
  return points.map(toLatLng).filter((point): point is LatLngLiteral => point !== null);
}

/** Recuadro que contiene todos los puntos; `null` si no hay ninguno. */
export function boundsFromPoints(points: LatLngLiteral[]): LatLngBoundsLiteral | null {
  if (points.length === 0) {
    return null;
  }

  return points.reduce<LatLngBoundsLiteral>(
    (bounds, point) => ({
      north: Math.max(bounds.north, point.lat),
      south: Math.min(bounds.south, point.lat),
      east: Math.max(bounds.east, point.lng),
      west: Math.min(bounds.west, point.lng),
    }),
    { north: points[0].lat, south: points[0].lat, east: points[0].lng, west: points[0].lng },
  );
}

/** Primer punto util, o el centro por defecto (Santo Domingo). */
export function centerFromPoints(points: LatLngLiteral[]): LatLngLiteral {
  return points[0] ?? DEFAULT_CENTER;
}

/** Clave estable para dependencias de efectos: evita reencuadrar en cada render. */
export function pointKey(point?: LatLngLiteral | null) {
  return point ? `${point.lat.toFixed(5)},${point.lng.toFixed(5)}` : "";
}

export function pointsKey(points: LatLngLiteral[]) {
  return points.map(pointKey).join("|");
}

/**
 * Reconstruye los puntos desde su clave.
 *
 * Permite que los efectos de camara dependan solo de strings primitivos,
 * sin refs ni excepciones a `react-hooks/exhaustive-deps`.
 */
export function parsePointsKey(key: string): LatLngLiteral[] {
  if (!key) {
    return [];
  }

  return key.split("|").map((chunk) => {
    const [lat, lng] = chunk.split(",").map(Number);
    return { lat, lng };
  });
}

/** Parada de una orden lista para dibujarse como marcador. */
export interface MapStop {
  id: string;
  label: string;
  position: LatLngLiteral;
  tone: Extract<MapTone, "pickup" | "dropoff">;
}

/**
 * Convierte las filas de orden (`mapOrderRow`) en marcadores de recogida y
 * entrega. Descarta las paradas sin coordenadas, que es el caso habitual en
 * ordenes creadas solo con provincia y municipio.
 */
export function stopsFromOrders(orders: DataRow[]): MapStop[] {
  return orders.flatMap((order) => {
    const code = String(order.id);
    const pickup = toLatLng({ latitude: Number(order.origenLat), longitude: Number(order.origenLng) });
    const dropoff = toLatLng({ latitude: Number(order.destinoLat), longitude: Number(order.destinoLng) });

    return [
      pickup && { id: `${code}-pickup`, label: `${code} · Recogida`, position: pickup, tone: "pickup" as const },
      dropoff && { id: `${code}-dropoff`, label: `${code} · Entrega`, position: dropoff, tone: "dropoff" as const },
    ].filter((stop): stop is MapStop => Boolean(stop));
  });
}
