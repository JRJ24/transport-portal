import { BatteryMedium, Clock3, LocateFixed, Route, Signal, TriangleAlert, Truck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { LiveMap } from "@/components/LiveMap";
import { Button, PageHeader, StatusBadge } from "@/components/ui";
import { useLiveLocations } from "@/services/realtime.service";
import { mapOrderRow, tmsService } from "@/services/tms.service";

const activeTrips = [
  { id: "ORD-000124", driver: "Juan Pérez", route: "SDE → DN", eta: "24 min", status: "En ruta" },
  { id: "ORD-000131", driver: "Ana Rojas", route: "Villa Mella → Piantini", eta: "16 min", status: "Recogida" },
  { id: "ORD-000142", driver: "Marta Cruz", route: "Naco → Las Américas", eta: "38 min", status: "En ruta" },
];

export function MapPage() {
  const ordersQuery = useQuery({ queryKey: ["map-orders"], queryFn: () => tmsService.orders(), refetchInterval: 15000 });
  const orders = ordersQuery.data?.map(mapOrderRow) ?? activeTrips.map((trip) => ({ id: trip.id, _id: trip.id, cliente: trip.driver, origen: trip.route.split(" → ")[0] ?? "--", destino: trip.route.split(" → ")[1] ?? "--", servicio: "--", vehiculo: "--", conductor: trip.driver, estado: trip.status, eta: trip.eta, precio: 0, fecha: "--", prioridad: "Normal" }));
  const liveLocations = useLiveLocations(orders.map((order) => String(order._id ?? order.id)));

  return <div><PageHeader title="Mapa en vivo" subtitle="Flota, alertas y entregas en tiempo real" action="Asignar viaje" onAction={() => undefined} />
    <section className="map-layout"><div className="map-workspace"><LiveMap locations={liveLocations} /><div className="map-controls"><button><LocateFixed size={17} /></button><button>+</button><button>−</button></div><div className="map-sync"><Signal size={14} /> {liveLocations.length ? `GPS actualizado: ${liveLocations.length} unidad(es)` : "Esperando ubicaciones Socket.IO"}</div></div>
      <aside className="trip-sidebar"><div className="trip-kpis"><article><Truck size={18} /><strong>{orders.length}</strong><span>Órdenes visibles</span></article><article><TriangleAlert size={18} /><strong>6</strong><span>Alertas abiertas</span></article><article><Signal size={18} /><strong>{liveLocations.length}</strong><span>Con señal</span></article></div><div className="trip-list"><header><div><h2>Viajes activos</h2><p>Seguimiento Socket.IO</p></div><span>{orders.length}</span></header>{orders.slice(0, 12).map((trip) => <button key={trip.id}><div className="trip-icon"><Truck size={17} /></div><span><strong>{trip.id}</strong><small>{trip.conductor} · {trip.origen} → {trip.destino}</small><em><Clock3 size={12} /> ETA {trip.eta} <BatteryMedium size={13} /> 86%</em></span><StatusBadge>{trip.estado}</StatusBadge></button>)}</div><div className="route-alert"><Route size={19} /><div><strong>Canal realtime activo</strong><span>Socket.IO emite tracking:location por orden</span></div><Button>Aplicar</Button></div></aside>
    </section>
  </div>;
}
