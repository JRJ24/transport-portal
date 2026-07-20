import { Navigation, TriangleAlert, Truck } from "lucide-react";
import { APIProvider, Map, Marker } from "@vis.gl/react-google-maps";
import type { LiveLocation } from "@/services/tms.service";

const markers = [
  { id: "ORD-124", type: "blue", x: 24, y: 28, icon: Navigation },
  { id: "RD-07", type: "green", x: 62, y: 53, icon: Truck },
  { id: "INC", type: "orange", x: 78, y: 24, icon: TriangleAlert },
  { id: "RD-11", type: "dark", x: 43, y: 70, icon: Truck },
];

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

  const liveMarkers = locations.slice(0, 8).map((location, index) => ({
    id: location.orderId.slice(0, 8),
    type: "green",
    x: 20 + ((index * 17) % 60),
    y: 24 + ((index * 13) % 56),
    icon: Truck,
  }));
  const visibleMarkers = liveMarkers.length ? liveMarkers : markers;

  return (
    <div className={`live-map ${compact ? "live-map--compact" : ""}`}>
      <div className="map-grid" />
      <div className="road road--one" /><div className="road road--two" /><div className="road road--three" /><div className="road road--four" />
      <div className="map-water" />
      {visibleMarkers.map((marker) => <div key={marker.id} className={`map-marker map-marker--${marker.type}`} style={{ left: `${marker.x}%`, top: `${marker.y}%` }}><marker.icon size={13} /><span>{marker.id}</span></div>)}
      {!compact && <div className="map-legend"><span><i className="blue" /> En ruta</span><span><i className="green" /> Disponible</span><span><i className="orange" /> Alerta</span></div>}
    </div>
  );
}
