import type { LucideIcon } from "lucide-react";

export type ModuleKey =
  | "dashboard"
  | "orders"
  | "reservations"
  | "map"
  | "drivers"
  | "vehicles"
  | "customers"
  | "rates"
  | "incidents"
  | "evidence"
  | "reports"
  | "audit"
  | "settings";

export type Tone = "blue" | "green" | "orange" | "red" | "slate" | "violet";

export interface NavItem {
  key: ModuleKey;
  label: string;
  icon: LucideIcon;
}

export interface Stat {
  label: string;
  value: string;
  helper?: string;
  tone: Tone;
  icon?: LucideIcon;
}

export interface DataRow {
  id: string;
  [key: string]: string | number;
}

export interface Column {
  key: string;
  label: string;
  type?: "status" | "money" | "text" | "strong";
}

export interface FormField {
  name: string;
  label: string;
  placeholder?: string;
  type?: "text" | "email" | "password" | "number" | "date" | "time" | "select" | "textarea";
  options?: Array<string | { label: string; value: string }>;
  required?: boolean;
}

export interface FilterConfig {
  label: string;
  name: string;
  options: { label: string; value: string }[];
}

export interface ModuleConfig {
  key: ModuleKey;
  title: string;
  subtitle: string;
  action: string;
  stats: Stat[];
  columns: Column[];
  rows: DataRow[];
  fields: FormField[];
  filters: Array<string | FilterConfig>;
}
