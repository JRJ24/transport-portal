import { useDeferredValue, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Button, DataTable, EntityForm, Modal, PageHeader, SearchFilters, StatCard, StatusBadge } from "@/components/ui";
import { queryKeys } from "@/lib/query-keys";
import { mapReservationRow, tmsService } from "@/services/tms.service";

const reservationFilters = [
  { label: "Estado", name: "status", options: ["ACTIVE", "RESCHUDULED", "CANCELLED", "EXPIRED", "COMPLETED"].map((value) => ({ label: value, value })) },
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
  const [weekOffset, setWeekOffset] = useState(0);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const weekStart = useMemo(() => addDays(startOfWeek(new Date()), weekOffset * 7), [weekOffset]);
  const weekEnd = useMemo(() => addDays(weekStart, 7), [weekStart]);
  const days = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)), [weekStart]);
  const query = useMemo(() => ({ search: deferredSearch, from: weekStart, to: weekEnd, ...filters }), [deferredSearch, filters, weekEnd, weekStart]);
  const reservationsQuery = useQuery({ queryKey: queryKeys.reservations(query), queryFn: () => tmsService.reservations(query), refetchInterval: 30000 });
  const rows = useMemo(() => (reservationsQuery.data ?? []).map(mapReservationRow), [reservationsQuery.data]);
  const active = rows.filter((row) => row.estado === "ACTIVE").length;
  const pending = rows.filter((row) => row.estado === "RESCHUDULED").length;
  const completed = rows.filter((row) => row.estado === "COMPLETED").length;
  const cancelled = rows.filter((row) => row.estado === "CANCELLED").length;
  const fields = [
    { name: "orderId", label: "ID de orden" },
    { name: "reservedFor", label: "Fecha reservada", type: "date" as const },
  ];
  const bookings = rows.map((row) => toBooking(row, weekStart)).filter((booking) => booking.day >= 0 && booking.day < 7);

  const save = async (values: Record<string, string>) => {
    try {
      await tmsService.createReservation(values);
      await queryClient.invalidateQueries({ queryKey: ["reservations"] });
      toast.success("Reserva creada en transport-api");
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo crear la reserva");
    }
  };

  return <div><PageHeader title="Reservas" subtitle="Capacidad planificada contra demanda" action="Crear reserva" onAction={() => setOpen(true)} />
    {reservationsQuery.isError && <div className="inline-alert">No se pudieron cargar las reservas desde la API.</div>}
    {reservationsQuery.isLoading && <div className="inline-alert inline-alert--info">Sincronizando reservas...</div>}
    <section className="stats-grid"><StatCard stat={{ label: "Esta semana", value: String(rows.length), helper: "Reservas API", tone: "blue" }} /><StatCard stat={{ label: "Activas", value: String(active), helper: "Capacidad bloqueada", tone: "green" }} /><StatCard stat={{ label: "Reprogramadas", value: String(pending), helper: "Requieren seguimiento", tone: "orange" }} /><StatCard stat={{ label: "Cerradas", value: String(completed + cancelled), helper: `${completed} completadas · ${cancelled} canceladas`, tone: "slate" }} /></section>
    <SearchFilters search={search} onSearch={setSearch} filters={reservationFilters} values={filters} onFilterChange={(name, value) => setFilters((current) => ({ ...current, [name]: value }))} />
    <div className="calendar-toolbar"><div><Button variant="secondary" onClick={() => setWeekOffset((value) => value - 1)}><ChevronLeft size={15} /></Button><Button variant="secondary" onClick={() => setWeekOffset(0)}>Hoy</Button><Button variant="secondary" onClick={() => setWeekOffset((value) => value + 1)}><ChevronRight size={15} /></Button><strong>{formatRange(weekStart, addDays(weekEnd, -1))}</strong></div><div className="segmented"><button className="active">Semana</button></div></div>
    <section className="calendar"><div className="calendar-head"><span>Hora</span>{days.map((day, index) => <strong className={index === 0 ? "today" : ""} key={day.toISOString()}>{formatDay(day)}</strong>)}</div><div className="calendar-body"><div className="time-axis">{["06:00", "08:00", "10:00", "12:00", "14:00", "16:00", "18:00"].map((time) => <span key={time}>{time}</span>)}</div>{days.map((day, index) => <div className="day-column" key={day.toISOString()}>{bookings.filter((item) => item.day === index).map((item) => <button className={`booking booking--${item.tone}`} key={item.id} style={{ top: `${item.top}%`, height: "18%" }}><strong>{item.title}</strong><span>{item.meta}</span><StatusBadge>{item.status}</StatusBadge></button>)}</div>)}</div></section>
    <div style={{ marginTop: 12 }}><DataTable columns={columns} rows={rows} onView={() => undefined} onEdit={() => toast.info("Usa acciones de API de reprogramación/cancelación en el detalle operativo.")} onDelete={() => toast.info("Cancela reservas desde acción explícita para mantener auditoría.")} /></div>
    <Modal open={open} onClose={() => setOpen(false)} title="Crear reserva" description="Bloquea capacidad para una orden y fecha específicas." wide><EntityForm fields={fields} onCancel={() => setOpen(false)} onSubmit={save} submitLabel="Crear reserva" /></Modal>
  </div>;
}

function toBooking(row: Record<string, string | number>, weekStart: Date) {
  const reservedFor = new Date(String(row.reservedFor));
  const day = Math.floor((startOfDay(reservedFor).getTime() - weekStart.getTime()) / 86_400_000);
  const hour = reservedFor.getHours() + reservedFor.getMinutes() / 60;
  const top = Math.min(82, Math.max(2, ((hour - 6) / 12) * 100));
  const status = String(row.estado);
  const tone = status === "CANCELLED" ? "orange" : status === "COMPLETED" ? "green" : "blue";

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
  return new Intl.DateTimeFormat("es-DO", { weekday: "short", day: "2-digit" }).format(date);
}

function formatRange(from: Date, to: Date) {
  const formatter = new Intl.DateTimeFormat("es-DO", { day: "2-digit", month: "short", year: "numeric" });
  return `${formatter.format(from)} - ${formatter.format(to)}`;
}
