/// <reference types="vite/client" />

/**
 * Variables de entorno del portal.
 *
 * Cadena de propagacion (no se modifica desde el codigo):
 *   .env  ->  docker-compose.yaml (portal.build.args)  ->  portal/Dockerfile (ARG/ENV)  ->  import.meta.env
 *
 * Ejemplo:  PORTAL_VITE_GOOGLE_MAPS_API_KEY  ->  VITE_GOOGLE_MAPS_API_KEY
 *
 * En desarrollo local se leen desde `transport-portal/.env.local`
 * (o `.env`) usando ya el nombre final `VITE_*`.
 */
interface ImportMetaEnv {
  /** Base REST usada por `pnpm dev`. Por defecto `/api/v1`. */
  readonly VITE_API_URL_DEV?: string;
  /** Base REST usada en el build de produccion. Por defecto `/api/v1`. */
  readonly VITE_API_URL_PROD?: string;
  /** Base REST alternativa (failover) en desarrollo. */
  readonly VITE_API_ALT_URL_DEV?: string;
  /** Base REST alternativa (failover) en produccion. */
  readonly VITE_API_ALT_URL_PROD?: string;
  /** Origen de Socket.IO en desarrollo. Vacio = mismo origen. */
  readonly VITE_SOCKET_URL_DEV?: string;
  /** Origen de Socket.IO en produccion. Vacio = mismo origen. */
  readonly VITE_SOCKET_URL_PROD?: string;

  /**
   * Clave *browser* de Google Maps JavaScript API.
   *
   * Requisitos en Google Cloud para que el mapa se vea sin marca de agua:
   *   1. API «Maps JavaScript API» habilitada en el proyecto.
   *   2. Cuenta de facturacion vinculada al proyecto (si no: BillingNotEnabledMapError).
   *   3. Restriccion de la clave por «Referentes HTTP» incluyendo el dominio del portal
   *      (si no: RefererNotAllowedMapError).
   *
   * Si esta vacia el portal no carga Google Maps y muestra el panel de configuracion.
   */
  readonly VITE_GOOGLE_MAPS_API_KEY?: string;

  /**
   * Map ID opcional (mapa vectorial creado en Google Cloud > Map Management).
   *
   * Cuando esta definido el portal usa `AdvancedMarker` + estilos de nube;
   * cuando esta vacio usa marcadores clasicos con iconos SVG locales.
   * Es opcional: no hace falta anadirlo al `.env` para que el mapa funcione.
   */
  readonly VITE_GOOGLE_MAPS_MAP_ID?: string;
}
