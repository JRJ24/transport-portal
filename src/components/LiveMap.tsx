import { MapPin } from "lucide-react";
import { APIProvider, Map, Marker } from "@vis.gl/react-google-maps";
import type { LiveLocation } from "@/services/tms.service";

export function LiveMap({ compact = false, locations = [] }: { compact?: boolean; locations?: LiveLocation[] }) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  if (apiKey) {
    const center = locations[0]
      ? { lat: locations[0].latitude, lng: locations[0].longitude }
      : { lat: 18.4861, lng: -69.9312 };

    return (
      <div className={`live-map live-map--google ${compact ? "live-map--compact" : ""}`}>
        <APIProvider apiKey={apiKey}>
          <Map defaultCenter={center} defaultZoom={12} gestureHandling="greedy" disableDefaultUI={compact}>
            {locations.map((location) => <Marker key={location.id} position={{ lat: location.latitude, lng: location.longitude }} title={location.orderId} />)}
          </Map>
        </APIProvider>
      </div>
    );
  }

  return (
    <div className={`live-map ${compact ? "live-map--compact" : ""}`}>
      <div className="map-empty"><MapPin size={18} /><span>Configura VITE_GOOGLE_MAPS_API_KEY para activar Google Maps</span>{locations.length > 0 && <small>{locations.length} ubicación(es) GPS reales recibidas</small>}</div>
    </div>
  );
}
