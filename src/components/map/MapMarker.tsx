import { AdvancedMarker, Marker, Pin } from "@vis.gl/react-google-maps";
import {
  MAP_TONES,
  hasGoogleMapsMapId,
  type LatLngLiteral,
  type MapTone,
} from "@/config/maps.config";

/**
 * Marcador con color por tipo de punto.
 *
 * `AdvancedMarker` solo funciona en mapas vectoriales, es decir cuando hay
 * Map ID configurado. Sin Map ID cae al marcador clasico con un pin SVG
 * generado en local, que no necesita ninguna libreria extra de Google.
 */
export function MapMarker({
  onClick,
  position,
  title,
  tone = "stop",
  zIndex,
}: {
  onClick?: () => void;
  position: LatLngLiteral;
  title?: string;
  tone?: MapTone;
  zIndex?: number;
}) {
  const { color, glyph } = MAP_TONES[tone];

  if (hasGoogleMapsMapId) {
    return (
      <AdvancedMarker position={position} title={title} zIndex={zIndex} onClick={onClick}>
        <Pin background={color} borderColor="#ffffff" glyph={glyph} glyphColor="#ffffff" />
      </AdvancedMarker>
    );
  }

  return (
    <Marker
      icon={pinDataUri(color)}
      onClick={onClick}
      position={position}
      title={title}
      zIndex={zIndex}
    />
  );
}

/** Pin en forma de gota con el color del tono, servido como data URI. */
function pinDataUri(color: string) {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="26" height="34" viewBox="0 0 26 34">` +
    `<path d="M13 0C5.82 0 0 5.82 0 13c0 8.6 11.4 20.3 13 21 1.6-.7 13-12.4 13-21C26 5.82 20.18 0 13 0z" fill="${color}"/>` +
    `<circle cx="13" cy="12.6" r="4.6" fill="#ffffff"/>` +
    `</svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}
