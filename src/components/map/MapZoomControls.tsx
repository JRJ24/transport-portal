import { LocateFixed, Minus, Plus } from "lucide-react";
import { useMap } from "@vis.gl/react-google-maps";
import {
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  FIT_PADDING,
  FOCUS_ZOOM,
  type LatLngLiteral,
} from "@/config/maps.config";
import { boundsFromPoints } from "@/lib/maps";

/**
 * Controles propios del mapa (zoom y reencuadre).
 *
 * Antes eran botones decorativos sin `onClick`. Ahora alcanzan la instancia
 * real de Google Maps por id, asi que viven fuera de `<Map>` sin problema.
 */
export function MapZoomControls({ mapId, points = [] }: { mapId: string; points?: LatLngLiteral[] }) {
  const map = useMap(mapId);

  const zoomBy = (delta: number) => {
    if (!map) {
      return;
    }

    map.setZoom((map.getZoom() ?? DEFAULT_ZOOM) + delta);
  };

  const recenter = () => {
    if (!map) {
      return;
    }

    const bounds = boundsFromPoints(points);
    if (!bounds) {
      map.setCenter(DEFAULT_CENTER);
      map.setZoom(DEFAULT_ZOOM);
      return;
    }

    if (points.length === 1) {
      map.setCenter(points[0]);
      map.setZoom(FOCUS_ZOOM);
      return;
    }

    map.fitBounds(bounds, FIT_PADDING);
  };

  return (
    <div className="map-controls">
      <button
        disabled={!map}
        onClick={recenter}
        title={points.length ? "Encuadrar unidades" : "Volver a Santo Domingo"}
        type="button"
      >
        <LocateFixed size={17} />
      </button>
      <button disabled={!map} onClick={() => zoomBy(1)} title="Acercar" type="button">
        <Plus size={15} />
      </button>
      <button disabled={!map} onClick={() => zoomBy(-1)} title="Alejar" type="button">
        <Minus size={15} />
      </button>
    </div>
  );
}
