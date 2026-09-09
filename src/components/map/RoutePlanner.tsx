import { useState } from "react";
import { ChevronDown, Crosshair, MapPin, Navigation, Search } from "lucide-react";
import { Polyline } from "@vis.gl/react-google-maps";
import { toast } from "sonner";
import {
  MAP_INSTANCE_IDS,
  MAP_TONES,
  ROUTE_STROKE,
  hasGoogleMapsKey,
  type LatLngLiteral,
} from "@/config/maps.config";
import { tmsService } from "@/services/tms.service";
import { MapCanvas } from "./MapCanvas";
import { MapMarker } from "./MapMarker";

export type StopScope = "origin" | "destination";

export interface ResolvedLocation {
  formattedAddress?: string;
  point: LatLngLiteral | null;
}

export interface PlannerStop {
  /** Direccion escrita en el formulario, para geocodificar. */
  address: string;
  /** Direccion legible que devolvio el geocodificador, si la hubo. */
  label?: string;
  point: LatLngLiteral | null;
}

export interface PlannerRoute {
  distanceKm: number;
  durationMin: number;
  polyline?: string;
  provider: string;
}

/**
 * Planificador de ruta en un solo mapa: recogida y entrega sobre el mismo
 * lienzo, como en las apps de viajes.
 *
 * Sustituye a los dos mapas independientes que habia por parada. Va plegado
 * para no alargar el modal y se abre cuando el operador lo necesita.
 */
export function RoutePlanner({
  destination,
  onResolve,
  origin,
  route,
}: {
  destination: PlannerStop;
  onResolve: (scope: StopScope, result: ResolvedLocation) => void;
  origin: PlannerStop;
  route: PlannerRoute | null;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<StopScope>("origin");
  const [busy, setBusy] = useState(false);

  const stops: Record<StopScope, PlannerStop> = { origin, destination };
  const activeStop = stops[active];
  const points = [origin.point, destination.point].filter(
    (point): point is LatLngLiteral => point !== null,
  );

  /** Fija la parada y, si venia de la recogida, salta a la entrega. */
  const setStop = (scope: StopScope, result: ResolvedLocation) => {
    onResolve(scope, result);
    if (scope === "origin" && result.point && !destination.point) {
      setActive("destination");
    }
  };

  const pickOnMap = async (point: LatLngLiteral) => {
    const scope = active;
    setStop(scope, { point });

    try {
      const [match] = await tmsService.reverseGeocode(point.lat, point.lng);
      if (match && match.provider !== "internal-mock") {
        onResolve(scope, { formattedAddress: match.formattedAddress, point });
      }
    } catch {
      // La parada ya quedo fijada; la direccion legible es un extra.
    }
  };

  const locateActiveAddress = async () => {
    setBusy(true);
    try {
      const [match] = await tmsService.geocode(activeStop.address);

      if (!match) {
        toast.error("No encontramos esa dirección. Marca el punto en el mapa.");
        return;
      }

      if (match.provider === "internal-mock") {
        toast.warning(
          "Geocodificación simulada: falta GOOGLE_MAPS_SERVER_API_KEY en la API. Marca el punto en el mapa.",
        );
        return;
      }

      setStop(active, {
        formattedAddress: match.formattedAddress,
        point: { lat: match.latitude, lng: match.longitude },
      });
      toast.success(match.formattedAddress);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo ubicar la dirección",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={open ? "route-planner is-open" : "route-planner"}>
      <header>
        <div className="route-planner__stops">
          {(["origin", "destination"] as const).map((scope) => (
            <button
              aria-pressed={open && active === scope}
              className="route-planner__stop"
              key={scope}
              onClick={() => {
                setActive(scope);
                setOpen(true);
              }}
              type="button"
            >
              <i
                style={{
                  background: MAP_TONES[scope === "origin" ? "pickup" : "dropoff"].color,
                }}
              />
              <span>
                <small>{scope === "origin" ? "Recogida" : "Entrega"}</small>
                <strong>{stopLabel(stops[scope])}</strong>
              </span>
            </button>
          ))}
        </div>
        <button
          className="route-planner__toggle"
          onClick={() => setOpen((current) => !current)}
          type="button"
        >
          {open ? "Ocultar mapa" : "Marcar en el mapa"} <ChevronDown size={14} />
        </button>
      </header>

      {open && (
        <div className="route-planner__body">
          <div className="route-planner__tools">
            <span>
              <MapPin size={13} /> Toca el mapa para fijar{" "}
              <strong>{active === "origin" ? "la recogida" : "la entrega"}</strong>
            </span>
            <div>
              <button
                disabled={busy || !hasText(activeStop.address)}
                onClick={locateActiveAddress}
                type="button"
              >
                <Search size={12} /> {busy ? "Ubicando..." : "Ubicar dirección escrita"}
              </button>
              <button
                disabled={!activeStop.point}
                onClick={() => onResolve(active, { point: null })}
                type="button"
              >
                <Crosshair size={12} /> Quitar
              </button>
            </div>
          </div>

          <div className="route-planner__map">
            <MapCanvas
              gesture="cooperative"
              id={MAP_INSTANCE_IDS.planner}
              onPick={pickOnMap}
              points={points}
              restrictToCountry
            >
              <RouteLine
                destination={destination.point}
                origin={origin.point}
                route={route}
              />
              {origin.point && (
                <MapMarker position={origin.point} title="Recogida" tone="pickup" />
              )}
              {destination.point && (
                <MapMarker
                  position={destination.point}
                  title="Entrega"
                  tone="dropoff"
                  zIndex={2}
                />
              )}
            </MapCanvas>
          </div>

          <small>
            {hasGoogleMapsKey
              ? "Elige arriba qué parada estás marcando; la dirección se rellena sola."
              : "El mapa se activa al configurar la clave browser; «Ubicar dirección escrita» funciona igual."}
          </small>
        </div>
      )}

      <footer>
        <Navigation size={13} />
        {route ? (
          <>
            <strong>
              {route.distanceKm.toFixed(1)} km · {Math.round(route.durationMin)} min
            </strong>
            <span>
              {route.provider === "google-routes"
                ? "Ruta real de Google Routes"
                : "Estimación en línea recta: la API no pudo consultar Google Routes"}
            </span>
          </>
        ) : (
          <span>
            {points.length === 2
              ? "Calculando ruta..."
              : "Marca la recogida y la entrega para calcular la ruta y la tarifa."}
          </span>
        )}
      </footer>
    </section>
  );
}

/** Ruta real de Google si la hay; si no, la recta que usa el cálculo interno. */
function RouteLine({
  destination,
  origin,
  route,
}: {
  destination: LatLngLiteral | null;
  origin: LatLngLiteral | null;
  route: PlannerRoute | null;
}) {
  if (route?.polyline) {
    return (
      <Polyline
        encodedPath={route.polyline}
        strokeColor={ROUTE_STROKE.color}
        strokeOpacity={ROUTE_STROKE.opacity}
        strokeWeight={ROUTE_STROKE.weight}
      />
    );
  }

  if (!origin || !destination) {
    return null;
  }

  return (
    <Polyline
      path={[origin, destination]}
      strokeColor={ROUTE_STROKE.color}
      strokeOpacity={0.45}
      strokeWeight={3}
    />
  );
}

function stopLabel(stop: PlannerStop) {
  return stop.label ?? (stop.point ? "Marcada en el mapa" : "Sin marcar");
}

function hasText(value: string) {
  return value.replace(/[\s,]/g, "").length > 0;
}
