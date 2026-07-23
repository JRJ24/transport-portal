import { useDeferredValue, useEffect, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, LogOut, Menu, Search, SunMoon, Wifi, X } from "lucide-react";
import { toast } from "sonner";
import { navigation } from "@/config/navigation";
import type { AuthUser } from "@/services/auth.service";
import {
  notificationService,
  type TmsNotification,
} from "@/services/notification.service";
import { createTrackingSocket } from "@/services/realtime.service";
import {
  mapCustomerRow,
  mapDriverRow,
  mapOrderRow,
  tmsService,
} from "@/services/tms.service";
import type { ModuleKey } from "@/types/domain";

type ThemeMode = "light" | "dark" | "system";
type SocketState = "connecting" | "connected" | "disconnected";

export function AppShell({
  active,
  onNavigate,
  user,
  onLogout,
  children,
}: {
  active: ModuleKey;
  onNavigate: (key: ModuleKey) => void;
  user: AuthUser;
  onLogout: () => void;
  children: ReactNode;
}) {
  const queryClient = useQueryClient();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [orderPing, setOrderPing] = useState(0);
  const [incidentPing, setIncidentPing] = useState(0);
  const [socketState, setSocketState] = useState<SocketState>("disconnected");
  const [theme, setTheme] = useState<ThemeMode>(() => readTheme());
  const deferredSearch = useDeferredValue(globalSearch.trim());

  useEffect(() => applyTheme(theme), [theme]);

  const summaryQuery = useQuery({
    queryKey: ["shell-dashboard"],
    queryFn: () => tmsService.dashboard(),
    refetchInterval: 30000,
  });
  const healthQuery = useQuery({
    queryKey: ["shell-health"],
    queryFn: () => tmsService.health(),
    refetchInterval: 30000,
  });
  const notificationsQuery = useQuery({
    queryKey: ["notifications"],
    queryFn: () => notificationService.listMine(),
    refetchInterval: 60000,
  });
  const searchQuery = useQuery({
    queryKey: ["global-search", deferredSearch],
    enabled: deferredSearch.length >= 2,
    queryFn: async () => {
      const [orders, customers, drivers] = await Promise.all([
        tmsService.orders({ search: deferredSearch }),
        tmsService.customers({ search: deferredSearch }),
        tmsService.drivers({ search: deferredSearch }),
      ]);
      return {
        orders: orders.map(mapOrderRow).slice(0, 5),
        customers: customers.map(mapCustomerRow).slice(0, 5),
        drivers: drivers.map(mapDriverRow).slice(0, 5),
      };
    },
  });

  useEffect(() => {
    const socket = createTrackingSocket();
    if (!socket) {
      return undefined;
    }

    const refreshOrders = () => {
      setOrderPing((value) => value + 1);
      void queryClient.invalidateQueries({
        queryKey: ["tms-module", "orders"],
      });
      void queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard-orders"] });
      void queryClient.invalidateQueries({ queryKey: ["map-orders"] });
      toast.info("Nueva orden recibida en TMS");
    };

    const refreshAssignments = () => {
      setOrderPing((value) => value + 1);
      void queryClient.invalidateQueries({
        queryKey: ["tms-module", "orders"],
      });
      void queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard-orders"] });
      void queryClient.invalidateQueries({ queryKey: ["map-orders"] });
      toast.success("Asignacion enviada al conductor");
    };

    const refreshIncidents = () => {
      setIncidentPing((value) => value + 1);
      void queryClient.invalidateQueries({ queryKey: ["incidents"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard-incidents"] });
      void queryClient.invalidateQueries({ queryKey: ["shell-dashboard"] });
      toast.warning("Nueva incidencia operativa");
    };

    const refreshNotifications = (notification: TmsNotification) => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.info(notification.title, { description: notification.message });
    };

    socket.on("connect", () => setSocketState("connected"));
    socket.on("disconnect", () => setSocketState("disconnected"));
    socket.on("connect_error", () => setSocketState("disconnected"));
    socket.on("order.created", refreshOrders);
    socket.on("assignment.created", refreshAssignments);
    socket.on("order.status.changed", () => {
      void queryClient.invalidateQueries({
        queryKey: ["tms-module", "orders"],
      });
      void queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    });
    socket.on("incident.created", refreshIncidents);
    socket.on("incident.updated", refreshIncidents);
    socket.on("notification.created", refreshNotifications);

    return () => {
      socket.disconnect();
    };
  }, [queryClient]);

  const navigate = (key: ModuleKey) => {
    onNavigate(key);
    setMobileOpen(false);
    setGlobalSearch("");
    if (key === "orders") setOrderPing(0);
    if (key === "incidents") setIncidentPing(0);
  };

  const notifications = notificationsQuery.data ?? [];
  const unreadCount = notifications.filter(
    (notification) => !notification.readAt,
  ).length;
  const openIncidents = summaryQuery.data?.openIncidents ?? 0;
  const gpsRatio = summaryQuery.data?.drivers
    ? Math.round(
        (summaryQuery.data.activeDrivers / summaryQuery.data.drivers) * 100,
      )
    : 0;
  const operationalStatus =
    healthQuery.data?.status === "ok" && socketState === "connected"
      ? "Online"
      : healthQuery.data?.database === "down"
        ? "Degradado"
        : "Conectando";
  const initials =
    user.fullName
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "TM";
  const searchResults = searchQuery.data;
  const hasSearchResults = Boolean(
    searchResults &&
    (searchResults.orders.length ||
      searchResults.customers.length ||
      searchResults.drivers.length),
  );

  const markRead = async (notification: TmsNotification) => {
    if (!notification.readAt) {
      await notificationService.markRead(notification.id);
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }
    const target = moduleForNotification(notification);
    if (target) navigate(target);
    setNotificationsOpen(false);
  };

  const toggleTheme = () => {
    const next =
      theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
    localStorage.setItem("theme", next);
    setTheme(next);
  };

  return (
    <div className="app-shell">
      {mobileOpen && (
        <button
          className="mobile-scrim"
          aria-label="Cerrar navegación"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside className={`sidebar ${mobileOpen ? "is-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">
            <span />
          </div>
          <div>
            <strong>RUTA RD</strong>
            <small>Control tower</small>
          </div>
          <button className="mobile-close" onClick={() => setMobileOpen(false)}>
            <X size={18} />
          </button>
        </div>
        <nav>
          {navigation.map((item) => {
            const badge =
              item.key === "incidents"
                ? openIncidents + incidentPing
                : item.key === "orders"
                  ? orderPing
                  : 0;
            return (
              <button
                key={item.key}
                className={active === item.key ? "active" : ""}
                onClick={() => navigate(item.key)}
              >
                <item.icon size={18} strokeWidth={1.8} />
                <span>{item.label}</span>
                {badge > 0 && <em>{badge > 99 ? "99+" : badge}</em>}
              </button>
            );
          })}
        </nav>
        <div className="sidebar-status">
          <span>
            <Wifi size={15} /> Estado operativo
          </span>
          <strong>
            {operationalStatus} · {gpsRatio}% GPS
          </strong>
          <small>
            Última sincronización: {formatSync(healthQuery.data?.timestamp)}
          </small>
        </div>
        <button className="sidebar-user" onClick={onLogout}>
          <div className="avatar">{initials}</div>
          <div>
            <strong>{user.fullName}</strong>
            <small>{user.roles.join(" · ")}</small>
          </div>
          <LogOut size={15} />
        </button>
      </aside>
      <main className="main-area">
        <div className="topbar">
          <button className="menu-toggle" onClick={() => setMobileOpen(true)}>
            <Menu size={20} />
          </button>
          <div className="global-search-wrap">
            <label className="global-search">
              <Search size={16} />
              <input
                value={globalSearch}
                onChange={(event) => setGlobalSearch(event.target.value)}
                placeholder="Buscar orden, cliente, conductor..."
              />
              <kbd>API</kbd>
            </label>
            {deferredSearch.length >= 2 && (
              <div className="global-results">
                {searchQuery.isFetching && <span>Buscando en API...</span>}
                {!searchQuery.isFetching && !hasSearchResults && (
                  <span>Sin resultados reales</span>
                )}
                {searchResults?.orders.map((order) => (
                  <button
                    key={`order-${order.id}`}
                    onClick={() => navigate("orders")}
                  >
                    <strong>{order.id}</strong>
                    <small>
                      {order.cliente} · {order.conductor}
                    </small>
                  </button>
                ))}
                {searchResults?.customers.map((customer) => (
                  <button
                    key={`customer-${customer.id}`}
                    onClick={() => navigate("customers")}
                  >
                    <strong>{customer.cliente}</strong>
                    <small>
                      {customer.documento} · {customer.estado}
                    </small>
                  </button>
                ))}
                {searchResults?.drivers.map((driver) => (
                  <button
                    key={`driver-${driver.id}`}
                    onClick={() => navigate("drivers")}
                  >
                    <strong>{driver.nombre}</strong>
                    <small>
                      {driver.licencia} · {driver.estado}
                    </small>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="topbar-actions">
            <button
              className="icon-button"
              title={`Tema: ${theme}`}
              onClick={toggleTheme}
            >
              <SunMoon size={18} />
            </button>
            <div className="notification-wrap">
              <button
                className="icon-button"
                onClick={() => setNotificationsOpen((value) => !value)}
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="notification-count">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
              {notificationsOpen && (
                <div className="notification-popover">
                  <header>
                    <strong>Bandeja</strong>
                    <span>{unreadCount} sin leer</span>
                  </header>
                  {notifications.slice(0, 8).map((notification) => (
                    <button
                      key={notification.id}
                      className={notification.readAt ? "" : "is-unread"}
                      onClick={() => void markRead(notification)}
                    >
                      <strong>{notification.title}</strong>
                      <small>{notification.message}</small>
                      <time>{formatSync(notification.createdAt)}</time>
                    </button>
                  ))}
                  {!notifications.length && <p>Sin notificaciones.</p>}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="page-content">{children}</div>
      </main>
    </div>
  );
}

function readTheme(): ThemeMode {
  const saved = localStorage.getItem("theme");
  return saved === "light" || saved === "dark" || saved === "system"
    ? saved
    : "system";
}

function applyTheme(theme: ThemeMode) {
  const resolved =
    theme === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : theme;
  document.documentElement.dataset.theme = resolved;
}

function formatSync(value?: string | null) {
  if (!value) return "sin datos";
  return new Intl.DateTimeFormat("es-DO", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function moduleForNotification(
  notification: TmsNotification,
): ModuleKey | null {
  const screen =
    typeof notification.data?.screen === "string"
      ? notification.data.screen
      : "";
  if (screen.includes("incident")) return "incidents";
  if (screen.includes("order")) return "orders";
  if (screen.includes("notification")) return null;
  return null;
}
