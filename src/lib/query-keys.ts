import type { ModuleKey } from "@/types/domain";
import type { QueryParams } from "@/services/tms.service";

export const queryKeys = {
  dashboard: ["dashboard-summary"] as const,
  module: (key: ModuleKey, query?: QueryParams) =>
    ["tms-module", key, query ?? {}] as const,
  orders: (query?: QueryParams) => ["orders", query ?? {}] as const,
  reservations: (query?: QueryParams) => ["reservations", query ?? {}] as const,
  mapOrders: (query?: QueryParams) => ["map-orders", query ?? {}] as const,
  mapLocations: (orderIds: string[]) => ["map-locations", orderIds] as const,
  rates: (query?: QueryParams) => ["rates", query ?? {}] as const,
  incidents: (query?: QueryParams) => ["incidents", query ?? {}] as const,
  evidence: (query?: QueryParams) => ["evidence", query ?? {}] as const,
  reports: (type: "operations" | "billing", query?: QueryParams) =>
    ["reports", type, query ?? {}] as const,
  audit: (query?: QueryParams) => ["audit", query ?? {}] as const,
  parameters: (query?: QueryParams) => ["parameters", query ?? {}] as const,
  catalogs: (query?: QueryParams) => ["catalogs", query ?? {}] as const,
  users: (query?: QueryParams) => ["users", query ?? {}] as const,
} as const;
