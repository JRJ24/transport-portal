import { InfoWindow } from "@vis.gl/react-google-maps";
import { useState } from "react";
import { MAP_INSTANCE_IDS, MAP_TONES, type LatLngLiteral } from "@/config/maps.config";
import { toLatLng, type MapStop } from "@/lib/maps";
import { MapCanvas } from "@/components/map/MapCanvas";
import { MapMarker } from "@/components/map/MapMarker";
import type { LiveLocation } from "@/services/tms.service";

export function LiveMap({
  compact = false,
  followOrderId,
  locations = [],
  stops = [],
}: {
  compact?: boolean;
  /** Orden a seguir con la camara; el resto se encuadra automaticamente. */
  followOrderId?: string;
  locations?: LiveLocation[];
  stops?: MapStop[];
}) {
  const [selected, setSelected] = useState<string | null>(null);

  const units = locations
    .map((location) => ({ location, position: toLatLng(location) }))
    .filter((unit): unit is { location: LiveLocation; position: LatLngLiteral } => unit.position !== null);

  const followPoint = followOrderId
    ? (units.find((unit) => unit.location.orderId === followOrderId)?.position ?? null)
    : null;
  const points = [...units.map((unit) => unit.position), ...stops.map((stop) => stop.position)];
  const active = units.find((unit) => unit.location.id === selected);

  return (
    <div className={`live-map ${compact ? "live-map--compact" : ""}`}>
      <MapCanvas
        compact={compact}
        followPoint={followPoint}
        id={compact ? MAP_INSTANCE_IDS.dashboard : MAP_INSTANCE_IDS.fleet}
        points={points}
      >
        {stops.map((stop) => (
          <MapMarker key={stop.id} position={stop.position} title={stop.label} tone={stop.tone} />
        ))}
        {units.map((unit) => (
          <MapMarker
            key={unit.location.id}
            onClick={() => setSelected(unit.location.id)}
            position={unit.position}
            title={unit.location.orderId}
            tone="driver"
            zIndex={2}
          />
        ))}
        {active && (
          <InfoWindow
            headerContent={<strong>{active.location.orderId}</strong>}
            onCloseClick={() => setSelected(null)}
            position={active.position}
          >
            <div className="map-info">
              <span>Último GPS: {formatFixTime(active.location.recordedAt)}</span>
              {active.location.speed !== null && active.location.speed !== undefined && (
                <span>Velocidad: {Math.round(active.location.speed)} km/h</span>
              )}
              {active.location.batteryLevel !== null && active.location.batteryLevel !== undefined && (
                <span>Batería: {active.location.batteryLevel}%</span>
              )}
            </div>
          </InfoWindow>
        )}
      </MapCanvas>
      {!compact && (units.length > 0 || stops.length > 0) && (
        <div className="map-legend">
          {(["driver", "pickup", "dropoff"] as const).map((tone) => (
            <span key={tone}>
              <i style={{ background: MAP_TONES[tone].color }} /> {MAP_TONES[tone].label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

const fixTimeFormat = new Intl.DateTimeFormat("es-DO", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

function formatFixTime(value?: string) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? fixTimeFormat.format(date) : "--";
}
