import {
  AlertTriangle,
  ArrowRight,
  Camera,
  PackageCheck,
  Route,
  Truck,
  Users,
} from "lucide-react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Button, PageHeader, StatCard, StatusBadge } from "@/components/ui";
import { LiveMap } from "@/components/LiveMap";
import { stopsFromOrders } from "@/lib/maps";
import { useLiveLocations } from "@/services/realtime.service";
import {
  mapLiveLocation,
  mapOrderRow,
  tmsService,
  type LiveLocation,
} from "@/services/tms.service";
import type { ModuleKey } from "@/types/domain";
import { formatMoney } from "@/lib/money";

export function DashboardPage({
  onNavigate,
  onNewOrder,
}: {
  onNavigate: (key: ModuleKey) => void;
  onNewOrder: () => void;
}) {
  const summaryQuery = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: () => tmsService.dashboard(),
    refetchInterval: 30000,
  });
  const ordersQuery = useQuery({
    queryKey: ["dashboard-orders"],
    queryFn: () => tmsService.orders(),
    refetchInterval: 15000,
  });
  const incidentsQuery = useQuery({
    queryKey: ["dashboard-incidents"],
    queryFn: () => tmsService.incidents({ status: "OPEN" }),
    refetchInterval: 30000,
  });
  const evidenceQuery = useQuery({
    queryKey: ["dashboard-evidence"],
    queryFn: () => tmsService.deliveryProofs({ validationStatus: "PENDING" }),
    refetchInterval: 30000,
  });
  const realOrders = ordersQuery.data?.map(mapOrderRow) ?? [];
  const activeOrderIds = realOrders
    .map((order) => String(order._id ?? ""))
    .filter(Boolean)
    .slice(0, 8);
  const latestLocationsQuery = useQuery({
    queryKey: ["dashboard-map-locations", activeOrderIds],
    queryFn: async () => {
      const results = await Promise.all(
        activeOrderIds.map((orderId) =>
          tmsService.latestLocation(orderId).catch(() => null),
        ),
      );
      return results
        .filter((location): location is Record<string, unknown> =>
          Boolean(location),
        )
        .map(mapLiveLocation);
    },
    enabled: activeOrderIds.length > 0,
    refetchInterval: 30000,
  });
  const liveLocations = useLiveLocations(activeOrderIds);
  const mapLocations = mergeLocations(
    latestLocationsQuery.data ?? [],
    liveLocations,
  );
  const mapStops = stopsFromOrders(realOrders.slice(0, 8));
  const openIncidents = incidentsQuery.data ?? [];
  const pendingEvidence = evidenceQuery.data ?? [];
  const ordersByStatus = summaryQuery.data?.ordersByStatus ?? {};
  const stats = [
    {
      label: "Órdenes activas",
      value: String(
        (ordersByStatus.REQUESTED ?? 0) +
          (ordersByStatus.ASSIGNED ?? 0) +
          (ordersByStatus.IN_PROGRESS ?? 0),
      ),
      helper: summaryQuery.data ? "Datos reales API" : "Sin datos API",
      tone: "blue" as const,
      icon: PackageCheck,
    },
    {
      label: "En ruta",
      value: String(ordersByStatus.IN_PROGRESS ?? 0),
      helper: "Tracking activo",
      tone: "slate" as const,
      icon: Route,
    },
    {
      label: "Entregadas",
      value: String(ordersByStatus.DELIVERED ?? 0),
      helper: "Histórico API",
      tone: "green" as const,
      icon: Truck,
    },
    {
      label: "Incidencias abiertas",
      value: String(summaryQuery.data?.openIncidents ?? openIncidents.length),
      helper: "Requieren atención",
      tone: "orange" as const,
      icon: AlertTriangle,
    },
    {
      label: "Conductores disponibles",
      value: String(summaryQuery.data?.activeDrivers ?? 0),
      helper: `${summaryQuery.data?.drivers ?? 0} conductores totales`,
      tone: "blue" as const,
      icon: Users,
    },
    {
      label: "Unidades",
      value: String(summaryQuery.data?.vehicles ?? 0),
      helper: "Flota registrada",
      tone: "slate" as const,
    },
  ];
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <PageHeader
        title="Centro de operaciones"
        subtitle="Órdenes, conductores y rutas activas en Santo Domingo"
        action="Nueva orden"
        onAction={onNewOrder}
      />
      <section className="stats-grid stats-grid--six">
        {stats.map((stat) => (
          <StatCard key={stat.label} stat={stat} />
        ))}
      </section>
      <section className="dashboard-primary">
        <article className="panel map-panel">
          <div className="panel-heading">
            <div>
              <h2>Mapa en vivo</h2>
              <p>Santo Domingo · rutas activas y zonas de incidencia</p>
            </div>
            <button className="text-link" onClick={() => onNavigate("map")}>
              Abrir mapa <ArrowRight size={14} />
            </button>
          </div>
          <LiveMap compact locations={mapLocations} stops={mapStops} />
        </article>
        <article className="panel dispatch-panel">
          <div className="panel-heading">
            <div>
              <h2>Cola de despacho</h2>
              <p>{realOrders.length} órdenes sincronizadas</p>
            </div>
            <span className="live-pill">
              <i /> En vivo
            </span>
          </div>
          <div className="dispatch-list">
            {realOrders.slice(0, 4).map((order) => (
              <button key={order.id} onClick={() => onNavigate("orders")}>
                <div>
                  <strong>{order.id}</strong>
                  <span>
                    {order.origen} → {order.destino} · {order.conductor}
                  </span>
                </div>
                <StatusBadge>{order.estado}</StatusBadge>
              </button>
            ))}
          </div>
        </article>
      </section>
      <section className="dashboard-secondary">
        <article className="panel recent-orders">
          <div className="panel-heading">
            <div>
              <h2>Órdenes recientes</h2>
              <p>Operación sincronizada con transport-api</p>
            </div>
            <button className="text-link" onClick={() => onNavigate("orders")}>
              Ver todas <ArrowRight size={14} />
            </button>
          </div>
          <div className="mini-table">
            {realOrders.slice(0, 4).map((order) => (
              <button key={order.id} onClick={() => onNavigate("orders")}>
                <strong>{order.id}</strong>
                <span>
                  {order.origen} → {order.destino}
                </span>
                <StatusBadge>{order.estado}</StatusBadge>
                <span>{order.eta}</span>
                <b>{formatMoney(order.precio as number | string | null)}</b>
              </button>
            ))}
          </div>
        </article>
        <div className="dashboard-stack">
          <article className="panel alert-panel">
            <div className="panel-heading">
              <div>
                <h2>Incidencias abiertas</h2>
                <p>Priorizadas por severidad y SLA</p>
              </div>
              <button
                className="text-link"
                onClick={() => onNavigate("incidents")}
              >
                Gestionar
              </button>
            </div>
            {openIncidents.slice(0, 2).map((incident) => (
              <button
                key={String(incident.id)}
                onClick={() => onNavigate("incidents")}
              >
                <AlertTriangle size={17} />
                <span>
                  <strong>{String(incident.title ?? "Incidencia")}</strong>
                  <small>
                    {incidentOrderLabel(incident)} ·{" "}
                    {String(incident.incidentType ?? "Tipo")}
                  </small>
                </span>
                <StatusBadge>
                  {String(incident.severity ?? incident.status ?? "OPEN")}
                </StatusBadge>
              </button>
            ))}
            {!openIncidents.length && (
              <button onClick={() => onNavigate("incidents")}>
                <AlertTriangle size={17} />
                <span>
                  <strong>Sin incidencias abiertas</strong>
                  <small>API sincronizada</small>
                </span>
                <StatusBadge>OK</StatusBadge>
              </button>
            )}
          </article>
          <article className="panel evidence-panel">
            <div className="panel-heading">
              <div>
                <h2>Evidencias pendientes</h2>
                <p>Validación antes de facturar</p>
              </div>
            </div>
            <button onClick={() => onNavigate("evidence")}>
              <Camera size={20} />
              <span>
                <strong>
                  {pendingEvidence.length} evidencia(s) por revisar
                </strong>
                <small>Datos reales de delivery-proofs</small>
              </span>
              <ArrowRight size={16} />
            </button>
          </article>
        </div>
      </section>
      <div className="quick-actions">
        <span>Acciones rápidas</span>
        <Button variant="secondary" onClick={() => onNavigate("drivers")}>
          Asignar conductor
        </Button>
        <Button variant="secondary" onClick={() => onNavigate("map")}>
          Ver mapa
        </Button>
        <Button variant="secondary" onClick={() => onNavigate("incidents")}>
          Reportar incidencia
        </Button>
      </div>
    </motion.div>
  );
}

function mergeLocations(initial: LiveLocation[], live: LiveLocation[]) {
  const byOrder = new Map<string, LiveLocation>();
  initial.forEach((location) => byOrder.set(location.orderId, location));
  live.forEach((location) => byOrder.set(location.orderId, location));
  return Array.from(byOrder.values());
}

function incidentOrderLabel(incident: Record<string, unknown>) {
  const order = incident.order;
  if (
    order &&
    typeof order === "object" &&
    !Array.isArray(order) &&
    "orderCode" in order
  ) {
    return String(order.orderCode ?? "Orden");
  }

  return "Orden";
}
