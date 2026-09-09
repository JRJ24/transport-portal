import { useState } from "react";
import {
  BatteryMedium,
  Clock3,
  Route,
  Signal,
  TriangleAlert,
  Truck,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { LiveMap } from "@/components/LiveMap";
import { MapZoomControls } from "@/components/map/MapZoomControls";
import { Button, PageHeader, StatusBadge } from "@/components/ui";
import { MAP_INSTANCE_IDS } from "@/config/maps.config";
import { queryKeys } from "@/lib/query-keys";
import { stopsFromOrders, toLatLng } from "@/lib/maps";
import { useLiveLocations } from "@/services/realtime.service";
import {
  mapLiveLocation,
  mapOrderRow,
  tmsService,
  type LiveLocation,
} from "@/services/tms.service";

export function MapPage() {
  const [followOrderId, setFollowOrderId] = useState<string>();
  const ordersQuery = useQuery({
    queryKey: queryKeys.mapOrders(),
    queryFn: () => tmsService.orders(),
    refetchInterval: 15000,
  });
  const incidentsQuery = useQuery({
    queryKey: ["map-incidents"],
    queryFn: () => tmsService.incidents({ status: "OPEN" }),
    refetchInterval: 30000,
  });
  const orders = (ordersQuery.data ?? [])
    .map(mapOrderRow)
    .filter(
      (order) =>
        !["DELIVERED", "CANCELLED", "FAILED"].includes(String(order.estado)),
    );
  const orderIds = orders
    .map((order) => String(order._id ?? order.id))
    .filter(Boolean);
  const latestLocationsQuery = useQuery({
    queryKey: queryKeys.mapLocations(orderIds),
    queryFn: async () => {
      const results = await Promise.all(
        orderIds.map((orderId) =>
          tmsService.latestLocation(orderId).catch(() => null),
        ),
      );
      return results
        .filter((location): location is Record<string, unknown> =>
          Boolean(location),
        )
        .map(mapLiveLocation);
    },
    enabled: orderIds.length > 0,
    refetchInterval: 30000,
  });
  const liveLocations = useLiveLocations(orderIds);
  const locations = mergeLocations(
    latestLocationsQuery.data ?? [],
    liveLocations,
  );
  const stops = stopsFromOrders(orders);
  const cameraPoints = [
    ...locations.map(toLatLng),
    ...stops.map((stop) => stop.position),
  ].filter((point): point is NonNullable<typeof point> => point !== null);
  const openIncidents = incidentsQuery.data?.length ?? 0;

  return (
    <div>
      <PageHeader
        title="Mapa en vivo"
        subtitle="Flota, alertas y entregas en tiempo real"
      />
      {(ordersQuery.isLoading || latestLocationsQuery.isLoading) && (
        <div className="inline-alert inline-alert--info">
          Cargando órdenes y última ubicación GPS...
        </div>
      )}
      {(ordersQuery.isError || latestLocationsQuery.isError) && (
        <div className="inline-alert">
          No se pudo sincronizar completamente el mapa con la API.
        </div>
      )}
      <section className="map-layout">
        <div className="map-workspace">
          <LiveMap followOrderId={followOrderId} locations={locations} stops={stops} />
          <MapZoomControls mapId={MAP_INSTANCE_IDS.fleet} points={cameraPoints} />
          <div className="map-sync">
            <Signal size={14} />{" "}
            {locations.length
              ? `GPS actualizado: ${locations.length} unidad(es)`
              : "Esperando ubicaciones reales"}
          </div>
        </div>
        <aside className="trip-sidebar">
          <div className="trip-kpis">
            <article>
              <Truck size={18} />
              <strong>{orders.length}</strong>
              <span>Órdenes visibles</span>
            </article>
            <article>
              <TriangleAlert size={18} />
              <strong>{openIncidents}</strong>
              <span>Alertas abiertas</span>
            </article>
            <article>
              <Signal size={18} />
              <strong>{locations.length}</strong>
              <span>Con señal</span>
            </article>
          </div>
          <div className="trip-list">
            <header>
              <div>
                <h2>Viajes activos</h2>
                <p>REST inicial + Socket.IO</p>
              </div>
              <span>{orders.length}</span>
            </header>
            {orders.slice(0, 12).map((trip) => {
              const tripOrderId = String(trip._id ?? trip.id);
              const following = followOrderId === tripOrderId;

              return (
                <button
                  aria-pressed={following}
                  key={trip.id}
                  onClick={() => setFollowOrderId(following ? undefined : tripOrderId)}
                  title={following ? "Dejar de seguir esta unidad" : "Seguir esta unidad en el mapa"}
                  type="button"
                >
                  <div className="trip-icon">
                    <Truck size={17} />
                  </div>
                  <span>
                    <strong>{trip.id}</strong>
                    <small>
                      {trip.conductor} · {trip.origen} → {trip.destino}
                    </small>
                    <em>
                      <Clock3 size={12} /> ETA {trip.eta}{" "}
                      <BatteryMedium size={13} />{" "}
                      {batteryFor(locations, tripOrderId)}
                    </em>
                  </span>
                  <StatusBadge>{trip.estado}</StatusBadge>
                </button>
              );
            })}
          </div>
          <div className="route-alert">
            <Route size={19} />
            <div>
              <strong>Canal realtime activo</strong>
              <span>Socket.IO emite tracking:location por orden</span>
            </div>
            <Button>Aplicar</Button>
          </div>
        </aside>
      </section>
    </div>
  );
}

function mergeLocations(initial: LiveLocation[], live: LiveLocation[]) {
  const byOrder = new Map<string, LiveLocation>();
  initial.forEach((location) => byOrder.set(location.orderId, location));
  live.forEach((location) => byOrder.set(location.orderId, location));
  return Array.from(byOrder.values());
}

function batteryFor(locations: LiveLocation[], orderId: string) {
  const value = locations.find(
    (location) => location.orderId === orderId,
  )?.batteryLevel;
  return value === null || value === undefined ? "--%" : `${value}%`;
}
