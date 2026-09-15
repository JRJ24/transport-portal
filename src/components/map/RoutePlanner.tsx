import { useState } from "react";
import { ChevronDown, Crosshair, MapPin, Navigation } from "lucide-react";
import { Polyline } from "@vis.gl/react-google-maps";
import {
  DEFAULT_CENTER,
  MAP_INSTANCE_IDS,
  MAP_TONES,
  ROUTE_STROKE,
  hasGoogleMapsKey,
  type LatLngLiteral,
} from "@/config/maps.config";
import { toast } from "sonner";
import { tmsService, type GeocodeComponents } from "@/services/tms.service";
import { AddressAutocomplete } from "./AddressAutocomplete";
import { MapCanvas } from "./MapCanvas";
import { MapMarker } from "./MapMarker";

export type StopScope = "origin" | "destination";

export interface ResolvedLocation {
  formattedAddress?: string;
  /** Provincia/municipio/calle ya separados por el backend, si los trae. */
  components?: GeocodeComponents;
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

      if (!match) {
        toast.warning(
          "No hay una dirección registrada en ese punto, pero la parada quedó marcada.",
        );
        return;
      }

      // El mock del backend devuelve las propias coordenadas como dirección,
      // que acabarían escritas en el campo Dirección.
      if (match.provider === "internal-mock") {
        toast.warning(
          "El servidor no tiene Google Maps configurado: escribe la dirección a mano.",
        );
        return;
      }

      onResolve(scope, {
        formattedAddress: match.formattedAddress,
        components: match.components,
        point,
      });
    } catch (error) {
      // La parada ya quedó fijada, pero el fallo no puede quedar en silencio.
      toast.error(
        error instanceof Error
          ? `No pudimos leer la dirección de ese punto: ${error.message}`
          : "No pudimos leer la dirección de ese punto.",
      );
    }
  };

  return (
    <section className={open ? "route-planner is-open" : "route-planner"}>
      <header>
        <div className="route-planner__stops">
          {(["origin", "destination"] as const).map((scope) => (
            <AddressAutocomplete
              active={active === scope}
              bias={
                stops[scope].point ??
                stops[scope === "origin" ? "destination" : "origin"].point ??
                DEFAULT_CENTER
              }
              defaultValue={stops[scope].label ?? ""}
              // Remonta el campo cuando la parada se fija desde el mapa: es
              // como React resetea estado, sin efectos de sincronia.
              key={`${scope}:${stops[scope].label ?? ""}`}
              label={scope === "origin" ? "Recogida" : "Entrega"}
              onActivate={() => setActive(scope)}
              onClear={() => onResolve(scope, { point: null })}
              onPick={(picked) =>
                setStop(scope, {
                  formattedAddress: picked.formattedAddress,
                  point: picked.point,
                })
              }
              placeholder={scope === "origin" ? "Dónde recogemos" : "A dónde va"}
              tone={MAP_TONES[scope === "origin" ? "pickup" : "dropoff"].color}
            />
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
            {activeStop.point && (
              <div>
                <button onClick={() => onResolve(active, { point: null })} type="button">
                  <Crosshair size={12} /> Quitar parada
                </button>
              </div>
            )}
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
              ? "Escribe arriba para buscar, o toca el mapa para afinar el punto."
              : "El mapa se activa al configurar la clave browser; el buscador de direcciones funciona igual."}
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
    // Dos trazos: uno inferior más ancho y oscuro que separa la ruta del mapa,
    // y el azul encima. Es lo que la hace legible sobre cualquier fondo.
    return (
      <>
        <Polyline
          encodedPath={route.polyline}
          strokeColor={ROUTE_STROKE.casing}
          strokeOpacity={0.9}
          strokeWeight={ROUTE_STROKE.weight + 4}
          zIndex={1}
        />
        <Polyline
          encodedPath={route.polyline}
          strokeColor={ROUTE_STROKE.color}
          strokeOpacity={ROUTE_STROKE.opacity}
          strokeWeight={ROUTE_STROKE.weight}
          zIndex={2}
        />
      </>
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

