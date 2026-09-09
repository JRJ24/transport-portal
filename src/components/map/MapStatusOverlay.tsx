import { MapPin, TriangleAlert, WifiOff } from "lucide-react";
import { APILoadingStatus, useApiLoadingStatus } from "@vis.gl/react-google-maps";
import { MAPS_DIAGNOSTICS, hasGoogleMapsKey } from "@/config/maps.config";

/**
 * Explica en pantalla por que el mapa no se ve.
 *
 * Sin esto el fallo de facturacion de Google (BillingNotEnabledMapError) se
 * queda solo en la consola del navegador y la UI muestra un mapa gris normal.
 *
 * Devuelve `null` cuando Google Maps carga bien, asi que se puede dejar
 * montado siempre dentro del contenedor del mapa.
 */
export function MapStatusOverlay({ hint }: { hint?: string }) {
  const status = useApiLoadingStatus();

  if (!hasGoogleMapsKey) {
    return (
      <div className="map-empty">
        <MapPin size={18} />
        <span>{MAPS_DIAGNOSTICS.missingKey.title}</span>
        <small>{MAPS_DIAGNOSTICS.missingKey.detail}</small>
        {hint && <small>{hint}</small>}
      </div>
    );
  }

  if (status === APILoadingStatus.AUTH_FAILURE) {
    return (
      <div className="map-empty map-empty--error">
        <TriangleAlert size={18} />
        <span>{MAPS_DIAGNOSTICS.authFailure.title}</span>
        <small>{MAPS_DIAGNOSTICS.authFailure.detail}</small>
        <ul className="map-checklist">
          {MAPS_DIAGNOSTICS.authFailure.checklist.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    );
  }

  if (status === APILoadingStatus.FAILED) {
    return (
      <div className="map-empty map-empty--error">
        <WifiOff size={18} />
        <span>{MAPS_DIAGNOSTICS.loadFailure.title}</span>
        <small>{MAPS_DIAGNOSTICS.loadFailure.detail}</small>
      </div>
    );
  }

  return null;
}
