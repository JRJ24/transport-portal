import { useDeferredValue, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import {
  Button,
  DataTable,
  Drawer,
  EntityForm,
  Modal,
  PageHeader,
  SearchFilters,
  StatCard,
  StatusBadge,
} from "@/components/ui";
import { labelOptions } from "@/lib/labels";
import { queryKeys } from "@/lib/query-keys";
import {
  mapOrderRow,
  mapReservationRow,
  tmsService,
} from "@/services/tms.service";
import type { DataRow } from "@/types/domain";

const reservationFilters = [
  {
    label: "Estado",
    name: "status",
    options: labelOptions("reservationStatus"),
  },
];

const columns = [
  { key: "orden", label: "Orden", type: "strong" as const },
  { key: "cliente", label: "Cliente" },
  { key: "reservado", label: "Reservado" },
  { key: "vehiculo", label: "Vehículo" },
  { key: "reprogramaciones", label: "Reprog." },
  { key: "estado", label: "Estado", type: "status" as const },
];

export function ReservationsPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DataRow | null>(null);
  const [viewing, setViewing] = useState<DataRow | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const weekStart = useMemo(
    () => addDays(startOfWeek(new Date()), weekOffset * 7),
    [weekOffset],
  );
  const weekEnd = useMemo(() => addDays(weekStart, 7), [weekStart]);
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)),
    [weekStart],
  );
  const query = useMemo(
    () => ({
      search: deferredSearch,
      from: weekStart,
      to: weekEnd,
      ...filters,
    }),
    [deferredSearch, filters, weekEnd, weekStart],
  );
  const reservationsQuery = useQuery({
    queryKey: queryKeys.reservations(query),
    queryFn: () => tmsService.reservations(query),
    refetchInterval: 30000,
  });
  const ordersQuery = useQuery({
    queryKey: ["lookup", "orders", "reservations"],
    queryFn: () => tmsService.orders({ serviceType: "SCHEDULED" }),
    enabled: open,
  });
  const rows = useMemo(
    () => (reservationsQuery.data ?? []).map(mapReservationRow),
    [reservationsQuery.data],
  );
  const active = rows.filter((row) => row.estadoInterno === "ACTIVE").length;
  const pending = rows.filter((row) => row.estadoInterno === "RESCHUDULED").length;
  const completed = rows.filter((row) => row.estadoInterno === "COMPLETED").length;
  const cancelled = rows.filter((row) => row.estadoInterno === "CANCELLED").length;
  const fields = [
    {
      name: "orderId",
      label: "Orden",
      type: "select" as const,
      options: (ordersQuery.data ?? []).map((order) => {
        const row = mapOrderRow(order);
        return {
          label: `${row.id} · ${row.cliente}`,
          value: String(row._id ?? row.id),
        };
      }),
    },
    { name: "reservedFor", label: "Fecha reservada", type: "date" as const },
  ];
  const bookings = rows
    .map((row) => toBooking(row, weekStart))
    .filter((booking) => booking.day >= 0 && booking.day < 7);

  const save = async (values: Record<string, string>) => {
    try {
      if (editing) {
        await tmsService.rescheduleReservation(String(editing.id), values.reservedFor);
      } else {
        await tmsService.createReservation(values);
      }
      await queryClient.invalidateQueries({ queryKey: ["reservations"] });
      toast.success(editing ? "Reserva reprogramada en transport-api" : "Reserva creada en transport-api");
      setOpen(false);
      setEditing(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo guardar la reserva",
      );
    }
  };

  const cancelReservation = async (id: string) => {
    try {
      await tmsService.cancelReservation(id);
      await queryClient.invalidateQueries({ queryKey: ["reservations"] });
      toast.success("Reserva cancelada en transport-api");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo cancelar la reserva");
    }
  };

  return (
    <div>
      <PageHeader
        title="Reservas"
        subtitle="Capacidad planificada contra demanda"
        action="Crear reserva"
        onAction={() => {
          setEditing(null);
          setOpen(true);
        }}
      />
      {reservationsQuery.isError && (
        <div className="inline-alert">
          No se pudieron cargar las reservas desde la API.
        </div>
      )}
      {reservationsQuery.isLoading && (
        <div className="inline-alert inline-alert--info">
          Sincronizando reservas...
        </div>
      )}
      <section className="stats-grid">
        <StatCard
          stat={{
            label: "Esta semana",
            value: String(rows.length),
            helper: "Reservas API",
            tone: "blue",
          }}
        />
        <StatCard
          stat={{
            label: "Activas",
            value: String(active),
            helper: "Capacidad bloqueada",
            tone: "green",
          }}
        />
        <StatCard
          stat={{
            label: "Reprogramadas",
            value: String(pending),
            helper: "Requieren seguimiento",
            tone: "orange",
          }}
        />
        <StatCard
          stat={{
            label: "Cerradas",
            value: String(completed + cancelled),
            helper: `${completed} completadas · ${cancelled} canceladas`,
            tone: "slate",
          }}
        />
      </section>
      <SearchFilters
        search={search}
        onSearch={setSearch}
        filters={reservationFilters}
        values={filters}
        onFilterChange={(name, value) =>
          setFilters((current) => ({ ...current, [name]: value }))
        }
      />
      <div className="calendar-toolbar">
        <div>
          <Button
            variant="secondary"
            onClick={() => setWeekOffset((value) => value - 1)}
          >
            <ChevronLeft size={15} />
          </Button>
          <Button variant="secondary" onClick={() => setWeekOffset(0)}>
            Hoy
          </Button>
          <Button
            variant="secondary"
            onClick={() => setWeekOffset((value) => value + 1)}
          >
            <ChevronRight size={15} />
          </Button>
          <strong>{formatRange(weekStart, addDays(weekEnd, -1))}</strong>
        </div>
      </div>
      <section className="calendar">
        <div className="calendar-head">
          <span>Hora</span>
          {days.map((day, index) => (
            <strong
              className={index === 0 ? "today" : ""}
              key={day.toISOString()}
            >
              {formatDay(day)}
            </strong>
          ))}
        </div>
        <div className="calendar-body">
          <div className="time-axis">
            {[
              "06:00",
              "08:00",
              "10:00",
              "12:00",
              "14:00",
              "16:00",
              "18:00",
            ].map((time) => (
              <span key={time}>{time}</span>
            ))}
          </div>
          {days.map((day, index) => (
            <div className="day-column" key={day.toISOString()}>
              {bookings
                .filter((item) => item.day === index)
                .map((item) => (
                  <button
                    className={`booking booking--${item.tone}`}
                    key={item.id}
                    style={{ top: `${item.top}%`, height: "18%" }}
                  >
                    <strong>{item.title}</strong>
                    <span>{item.meta}</span>
                    <StatusBadge>{item.status}</StatusBadge>
                  </button>
                ))}
            </div>
          ))}
        </div>
      </section>
      <div style={{ marginTop: 12 }}>
        <DataTable
          columns={columns}
          rows={rows}
          onView={(row) => setViewing(row)}
          onEdit={(row) => {
            setEditing({ ...row, reservedFor: String(row.reservedFor).slice(0, 10) });
            setOpen(true);
          }}
          onDelete={(row) => void cancelReservation(String(row.id))}
        />
      </div>
      <Drawer
        entityId={viewing ? String(viewing.orderId) : undefined}
        entityType="ORDER"
        row={open ? null : viewing}
        fields={[
          { key: "orden", label: "Orden", section: "Reserva" },
          { key: "cliente", label: "Cliente", section: "Reserva" },
          { key: "reservado", label: "Fecha reservada", section: "Reserva" },
          { key: "vehiculo", label: "Vehículo", section: "Reserva" },
          { key: "reprogramaciones", label: "Reprogramaciones", section: "Reserva" },
          { key: "estado", label: "Estado", type: "status", section: "Reserva" },
        ]}
        onClose={() => setViewing(null)}
        extraActions={
          viewing ? (
            <Button
              variant="secondary"
              onClick={() => {
                setEditing({ ...viewing, reservedFor: String(viewing.reservedFor).slice(0, 10) });
                setViewing(null);
                setOpen(true);
              }}
            >
              Reprogramar
            </Button>
          ) : null
        }
      />
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Reprogramar reserva" : "Crear reserva"}
        description={editing ? "Actualiza la fecha reservada." : "Bloquea capacidad para una orden y fecha específicas."}
        wide
      >
        <EntityForm
          fields={fields}
          initial={editing ?? undefined}
          onCancel={() => {
            setOpen(false);
            setEditing(null);
          }}
          onSubmit={save}
          submitLabel={editing ? "Reprogramar" : "Crear reserva"}
        />
      </Modal>
    </div>
  );
}

function toBooking(row: Record<string, string | number>, weekStart: Date) {
  const reservedFor = new Date(String(row.reservedFor));
  const day = Math.floor(
    (startOfDay(reservedFor).getTime() - weekStart.getTime()) / 86_400_000,
  );
  const hour = reservedFor.getHours() + reservedFor.getMinutes() / 60;
  const top = Math.min(82, Math.max(2, ((hour - 6) / 12) * 100));
  const status = String(row.estado);
  const tone =
    status === "CANCELLED"
      ? "orange"
      : status === "COMPLETED"
        ? "green"
        : "blue";

  return {
    id: String(row.id),
    day,
    top,
    tone,
    title: String(row.cliente),
    meta: `${String(row.reservado)} · ${String(row.vehiculo)}`,
    status,
  };
}

function startOfWeek(date: Date) {
  const copy = startOfDay(date);
  const day = copy.getDay() || 7;
  return addDays(copy, 1 - day);
}

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function formatDay(date: Date) {
  return new Intl.DateTimeFormat("es-DO", {
    weekday: "short",
    day: "2-digit",
  }).format(date);
}

function formatRange(from: Date, to: Date) {
  const formatter = new Intl.DateTimeFormat("es-DO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  return `${formatter.format(from)} - ${formatter.format(to)}`;
}
