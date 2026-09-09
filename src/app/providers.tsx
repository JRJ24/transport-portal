import type { ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { APIProvider } from "@vis.gl/react-google-maps";
import { Toaster } from "sonner";
import { queryClient } from "@/app/query-client";
import {
  MAPS_LANGUAGE,
  MAPS_LIBRARIES,
  MAPS_REGION,
  googleMapsApiKey,
  hasGoogleMapsKey,
} from "@/config/maps.config";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <GoogleMapsProvider>
        {children}
        <Toaster position="top-right" richColors closeButton />
      </GoogleMapsProvider>
    </QueryClientProvider>
  );
}

/**
 * Carga el script de Google Maps una sola vez para todo el portal.
 *
 * Antes cada `LiveMap` montaba su propio `APIProvider`, asi que el dashboard y
 * la pantalla de mapa creaban dos contextos y recargaban el script al navegar.
 * Sin clave no se monta nada: los mapas muestran el panel de configuracion.
 */
function GoogleMapsProvider({ children }: { children: ReactNode }) {
  if (!hasGoogleMapsKey) {
    return children;
  }

  return (
    <APIProvider
      apiKey={googleMapsApiKey}
      language={MAPS_LANGUAGE}
      libraries={MAPS_LIBRARIES}
      onError={(error) => console.error("[google-maps] no se pudo cargar la API", error)}
      region={MAPS_REGION}
    >
      {children}
    </APIProvider>
  );
}
