import { useEffect, useState, type ReactNode } from "react";
import { ColorScheme, Map, useMap } from "@vis.gl/react-google-maps";
import {
  COMPACT_ZOOM,
  DEFAULT_ZOOM,
  FIT_PADDING,
  FOCUS_ZOOM,
  MAX_FIT_ZOOM,
  googleMapsMapId,
  hasGoogleMapsKey,
  hasGoogleMapsMapId,
  type LatLngLiteral,
} from "@/config/maps.config";
import { boundsFromPoints, centerFromPoints, parsePointsKey, pointKey, pointsKey } from "@/lib/maps";
import { MapStatusOverlay } from "./MapStatusOverlay";

export interface MapCanvasProps {
  children?: ReactNode;
  /**
   * Mapa reducido del dashboard: sin controles, zoom mas amplio y gestos
   * `cooperative` para que la rueda del raton siga desplazando la pagina.
   */
  compact?: boolean;
  /** Cuando llega, la camara sigue a este punto (GPS en vivo). */
  followPoint?: LatLngLiteral | null;
  /** Id de instancia; obligatorio porque el portal monta varios mapas. */
  id: string;
  /** Puntos a encuadrar automaticamente mientras no haya `followPoint`. */
  points?: LatLngLiteral[];
}

/**
 * Contenedor unico de Google Maps del portal.
 *
 * Aporta lo que faltaba en cada pantalla por separado: altura real via
 * `.map-canvas`, encuadre automatico sobre los marcadores, seguimiento del
 * GPS en vivo, tema claro/oscuro sincronizado y diagnostico de errores.
 *
 * El padre debe tener altura propia y `position: relative`.
 */
export function MapCanvas({ children, compact = false, followPoint = null, id, points = [] }: MapCanvasProps) {
  const colorScheme = useDocumentColorScheme();

  if (!hasGoogleMapsKey) {
    return <MapStatusOverlay />;
  }

  return (
    <>
      <Map
        className="map-canvas"
        clickableIcons={false}
        colorScheme={colorScheme}
        defaultCenter={centerFromPoints(points)}
        defaultZoom={compact ? COMPACT_ZOOM : DEFAULT_ZOOM}
        disableDefaultUI
        fullscreenControl={!compact}
        gestureHandling={compact ? "cooperative" : "greedy"}
        id={id}
        keyboardShortcuts={!compact}
        mapId={hasGoogleMapsMapId ? googleMapsMapId : undefined}
        reuseMaps
      >
        <MapCamera followPoint={followPoint} points={points} />
        {children}
      </Map>
      <MapStatusOverlay />
    </>
  );
}

/**
 * Mueve la camara cuando cambian los datos.
 *
 * Sin esto los mapas quedaban clavados en `defaultCenter` y los marcadores
 * que llegaban despues aparecian fuera de pantalla.
 */
function MapCamera({ followPoint, points }: { followPoint: LatLngLiteral | null; points: LatLngLiteral[] }) {
  const map = useMap();
  const followKey = pointKey(followPoint);
  const fitKey = pointsKey(points);

  useEffect(() => {
    if (!map) {
      return undefined;
    }

    const [follow] = parsePointsKey(followKey);
    if (follow) {
      map.panTo(follow);
      if ((map.getZoom() ?? 0) < FOCUS_ZOOM) {
        map.setZoom(FOCUS_ZOOM);
      }
      return undefined;
    }

    const targets = parsePointsKey(fitKey);
    if (targets.length === 1) {
      map.setCenter(targets[0]);
      map.setZoom(FOCUS_ZOOM);
      return undefined;
    }

    const bounds = boundsFromPoints(targets);
    if (!bounds) {
      return undefined;
    }

    map.fitBounds(bounds, FIT_PADDING);

    // `fitBounds` puede pasarse de zoom con puntos muy juntos.
    const listener = map.addListener("idle", () => {
      if ((map.getZoom() ?? 0) > MAX_FIT_ZOOM) {
        map.setZoom(MAX_FIT_ZOOM);
      }
      listener.remove();
    });

    return () => listener.remove();
  }, [fitKey, followKey, map]);

  return null;
}

/** Sigue el `data-theme` del portal para que el mapa no quede blanco en modo oscuro. */
function useDocumentColorScheme() {
  const [dark, setDark] = useState(() => document.documentElement.dataset.theme === "dark");

  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setDark(root.dataset.theme === "dark");
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributeFilter: ["data-theme"] });
    sync();
    return () => observer.disconnect();
  }, []);

  return dark ? ColorScheme.DARK : ColorScheme.LIGHT;
}
