import { api } from '@/lib/axios';
import { unwrapApiResponse } from '@/lib/api-response';
import type { ApiResponse } from '@/types/api.types';
import type { DataRow, ModuleKey } from '@/types/domain';

type AnyRecord = Record<string, unknown>;

export interface DashboardSummary {
  users: number;
  drivers: number;
  activeDrivers: number;
  vehicles: number;
  ordersByStatus: Record<string, number>;
  openIncidents: number;
  pendingOrders: number;
}

export interface LiveLocation {
  id: string;
  driverId: string;
  orderId: string;
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  speed?: number | null;
  batteryLevel?: number | null;
  recordedAt: string;
  receivedAt: string;
}

const apiModules = new Set<ModuleKey>(['orders', 'drivers', 'vehicles', 'customers']);

export function isApiModule(key: ModuleKey) {
  return apiModules.has(key);
}

export const tmsService = {
  async dashboard() {
    const response = await api.get<ApiResponse<DashboardSummary>>('/dashboard/summary');
    return unwrapApiResponse(response.data);
  },

  async listModuleRows(key: ModuleKey): Promise<DataRow[]> {
    switch (key) {
      case 'orders':
        return (await this.orders()).map(mapOrderRow);
      case 'drivers':
        return (await this.drivers()).map(mapDriverRow);
      case 'vehicles':
        return (await this.vehicles()).map(mapVehicleRow);
      case 'customers':
        return (await this.customers()).map(mapCustomerRow);
      default:
        return [];
    }
  },

  async orders() {
    const response = await api.get<ApiResponse<AnyRecord[]>>('/orders');
    return unwrapApiResponse(response.data);
  },

  async drivers() {
    const response = await api.get<ApiResponse<AnyRecord[]>>('/drivers');
    return unwrapApiResponse(response.data);
  },

  async vehicles() {
    const response = await api.get<ApiResponse<AnyRecord[]>>('/vehicles');
    return unwrapApiResponse(response.data);
  },

  async customers() {
    const response = await api.get<ApiResponse<AnyRecord[]>>('/customers');
    return unwrapApiResponse(response.data);
  },

  async createTmsOrder(values: Record<string, string>) {
    const payload = {
      customerId: values.customerId,
      vehicleCategoryId: values.vehicleCategoryId,
      serviceType: values.serviceType || 'INMEDIATE',
      scheduleAt: values.scheduleAt ? new Date(values.scheduleAt).toISOString() : undefined,
      distanceKm: toNumber(values.distanceKm),
      estimatedDurationMin: Math.round(toNumber(values.estimatedDurationMin)),
      totalAmount: toNumber(values.totalAmount),
      notes: values.notes || undefined,
      stops: [
        {
          stopType: 'PICKUP',
          sequence: 1,
          contactName: values.originContactName,
          contactPhone: values.originContactPhone,
          addressLine: values.originAddress,
          city: values.originCity,
          province: values.originProvince,
          latitude: toNumber(values.originLatitude),
          longitude: toNumber(values.originLongitude),
          instructions: values.originInstructions || undefined,
        },
        {
          stopType: 'DROPOFF',
          sequence: 2,
          contactName: values.destinationContactName,
          contactPhone: values.destinationContactPhone,
          addressLine: values.destinationAddress,
          city: values.destinationCity,
          province: values.destinationProvince,
          latitude: toNumber(values.destinationLatitude),
          longitude: toNumber(values.destinationLongitude),
          instructions: values.destinationInstructions || undefined,
        },
      ],
      items: [
        {
          description: values.itemDescription,
          quantity: Math.max(1, Math.round(toNumber(values.itemQuantity))),
          weightKg: toNumber(values.itemWeightKg),
          volumeM3: values.itemVolumeM3 ? toNumber(values.itemVolumeM3) : undefined,
          declaredValue: values.itemDeclaredValue ? toNumber(values.itemDeclaredValue) : undefined,
          fragile: values.itemFragile === 'true',
          requireHelper: values.itemRequireHelper === 'true',
        },
      ],
    };

    const response = await api.post<ApiResponse<AnyRecord>>('/orders/tms', payload);
    return unwrapApiResponse(response.data);
  },
};

export function mapOrderRow(order: AnyRecord): DataRow {
  const stops = asRecordArray(order.orderStops);
  const pickup = stops.find((stop) => stop.stopType === 'PICKUP') ?? stops[0];
  const dropoff = stops.find((stop) => stop.stopType === 'DROPOFF') ?? stops[stops.length - 1];
  const assignment = asRecordArray(order.orderAssignments)[0];
  const customer = asRecord(order.customer);
  const customerUser = asRecord(customer?.user);
  const driver = asRecord(assignment?.driver);
  const driverUser = asRecord(driver?.user);
  const vehicleCategory = asRecord(order.vehicleCategory);
  const customerName = getString(customer, 'companyName') ?? getString(customerUser, 'fullName') ?? getString(order, 'customerId') ?? '--';
  const driverName = getString(driverUser, 'fullName') ?? 'Sin asignar';

  return {
    id: getString(order, 'orderCode') ?? getString(order, 'id') ?? '--',
    _id: getString(order, 'id') ?? '--',
    cliente: customerName,
    origen: getString(pickup, 'addressLine') ?? getString(pickup, 'city') ?? '--',
    destino: getString(dropoff, 'addressLine') ?? getString(dropoff, 'city') ?? '--',
    servicio: getString(order, 'serviceType') ?? '--',
    vehiculo: getString(vehicleCategory, 'name') ?? getString(order, 'vehicleCategoryId') ?? '--',
    conductor: driverName,
    estado: getString(order, 'status') ?? '--',
    eta: `${getNumber(order, 'estimatedDurationMin') ?? '--'} min`,
    precio: getNumber(order, 'totalAmount') ?? 0,
    fecha: formatDate(getString(order, 'createdAt')),
    prioridad: getString(order, 'status') === 'REQUESTED' ? 'Alta' : 'Normal',
  };
}

export function mapDriverRow(driver: AnyRecord): DataRow {
  const user = asRecord(driver.user);

  return {
    id: getString(driver, 'id') ?? '--',
    nombre: getString(user, 'fullName') ?? getString(driver, 'userId') ?? '--',
    licencia: getString(driver, 'licenseNumber') ?? '--',
    zona: getString(driver, 'zone') ?? 'Sin zona',
    turno: getString(driver, 'shift') ?? 'Disponible',
    score: getNumber(driver, 'ratingAVG') ?? 0,
    estado: getString(driver, 'availabilityStatus') ?? '--',
  };
}

export function mapVehicleRow(vehicle: AnyRecord): DataRow {
  const vehicleCategory = asRecord(vehicle.vehicleCategory);

  return {
    id: getString(vehicle, 'id') ?? '--',
    placa: getString(vehicle, 'plateNumber') ?? '--',
    tipo: getString(vehicleCategory, 'name') ?? getString(vehicle, 'categoryId') ?? '--',
    marca: `${getString(vehicle, 'brand') ?? ''} ${getString(vehicle, 'model') ?? ''}`.trim(),
    km: getString(vehicle, 'kilometers') ?? '--',
    proximo: getString(vehicle, 'nextService') ?? '--',
    estado: getString(vehicle, 'status') ?? '--',
  };
}

export function mapCustomerRow(customer: AnyRecord): DataRow {
  const user = asRecord(customer.user);

  return {
    id: getString(customer, 'id') ?? '--',
    cliente: getString(customer, 'companyName') ?? getString(user, 'fullName') ?? getString(customer, 'documentNumber') ?? '--',
    tipo: getString(customer, 'customerType') ?? '--',
    volumen: String(asRecordArray(customer.transportOrders).length || '--'),
    sla: '--',
    cobro: getString(customer, 'billingEmail') ? 'OK' : 'Pendiente',
    estado: getString(user, 'status') ?? 'ACTIVE',
  };
}

function toNumber(value: string) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    throw new Error(`Valor numérico inválido: ${value}`);
  }

  return parsed;
}

function formatDate(value: string | undefined) {
  if (!value) {
    return '--';
  }

  return new Intl.DateTimeFormat('es-DO', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function asRecord(value: unknown): AnyRecord | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as AnyRecord)
    : undefined;
}

function asRecordArray(value: unknown): AnyRecord[] {
  return Array.isArray(value) ? value.filter((item): item is AnyRecord => Boolean(asRecord(item))) : [];
}

function getString(source: AnyRecord | undefined, key: string): string | undefined {
  const value = source?.[key];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function getNumber(source: AnyRecord | undefined, key: string): number | undefined {
  const value = source?.[key];
  const parsed = typeof value === 'number' || typeof value === 'string' ? Number(value) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : undefined;
}
