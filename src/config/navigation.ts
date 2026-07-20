import {
  BarChart3,
  CalendarDays,
  CarFront,
  CircleDollarSign,
  ClipboardCheck,
  FileSearch,
  Gauge,
  Map,
  PackageCheck,
  Settings,
  ShieldAlert,
  Truck,
  Users,
} from "lucide-react";
import type { NavItem } from "@/types/domain";

export const navigation: NavItem[] = [
  { key: "dashboard", label: "Dashboard", icon: Gauge },
  { key: "orders", label: "Órdenes", icon: PackageCheck },
  { key: "reservations", label: "Reservas", icon: CalendarDays },
  { key: "map", label: "Mapa en vivo", icon: Map },
  { key: "drivers", label: "Conductores", icon: Users },
  { key: "vehicles", label: "Vehículos", icon: Truck },
  { key: "customers", label: "Clientes", icon: CarFront },
  { key: "rates", label: "Tarifas", icon: CircleDollarSign },
  { key: "incidents", label: "Incidencias", icon: ShieldAlert },
  { key: "evidence", label: "Evidencias", icon: ClipboardCheck },
  { key: "reports", label: "Reportes", icon: BarChart3 },
  { key: "audit", label: "Auditoría", icon: FileSearch },
  { key: "settings", label: "Configuración", icon: Settings },
];
