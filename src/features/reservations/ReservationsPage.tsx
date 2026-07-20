import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Button, EntityForm, Modal, PageHeader, StatCard, StatusBadge } from "@/components/ui";

const days = ["Lun 20", "Mar 21", "Mié 22", "Jue 23", "Vie 24", "Sáb 25", "Dom 26"];
const bookings = [
  { day: 0, top: 12, height: 19, title: "Almacenes Unidos", meta: "08:00 · Furgón 26'", tone: "blue" },
  { day: 1, top: 32, height: 26, title: "Grupo Ramos", meta: "10:30 · Reefer", tone: "orange" },
  { day: 2, top: 18, height: 38, title: "DP World", meta: "09:00 · Chasis", tone: "green" },
  { day: 3, top: 57, height: 18, title: "Plaza Lama", meta: "14:00 · Van", tone: "blue" },
  { day: 4, top: 24, height: 27, title: "Cervecería", meta: "09:30 · Furgón 53'", tone: "violet" },
  { day: 5, top: 44, height: 21, title: "Farmacia Carol", meta: "12:00 · Van", tone: "green" },
];

export function ReservationsPage() {
  const [open, setOpen] = useState(false);
  const fields = [
    { name: "cliente", label: "Cliente" }, { name: "fecha", label: "Fecha", type: "date" as const }, { name: "hora", label: "Hora", type: "time" as const },
    { name: "capacidad", label: "Capacidad requerida" }, { name: "vehiculo", label: "Tipo de vehículo", type: "select" as const, options: ["Van", "Furgón 26'", "Furgón 53'", "Reefer", "Chasis"] },
    { name: "estado", label: "Estado", type: "select" as const, options: ["Activa", "Reprogramada", "Pendiente"] },
  ];
  return <div><PageHeader title="Reservas" subtitle="Capacidad planificada contra demanda" action="Crear reserva" onAction={() => setOpen(true)} />
    <section className="stats-grid"><StatCard stat={{ label: "Esta semana", value: "38", helper: "12 pallets promedio", tone: "blue" }} /><StatCard stat={{ label: "Confirmadas", value: "31", helper: "81.5% de la capacidad", tone: "green" }} /><StatCard stat={{ label: "Pendientes", value: "5", helper: "Esperando confirmación", tone: "orange" }} /><StatCard stat={{ label: "Reprogramadas", value: "2", helper: "Sin impacto en SLA", tone: "slate" }} /></section>
    <div className="calendar-toolbar"><div><Button variant="secondary"><ChevronLeft size={15} /></Button><Button variant="secondary">Hoy</Button><Button variant="secondary"><ChevronRight size={15} /></Button><strong>20–26 de julio, 2026</strong></div><div className="segmented"><button className="active">Semana</button><button>Mes</button></div></div>
    <section className="calendar"><div className="calendar-head"><span>Hora</span>{days.map((day, index) => <strong className={index === 0 ? "today" : ""} key={day}>{day}</strong>)}</div><div className="calendar-body"><div className="time-axis">{["06:00", "08:00", "10:00", "12:00", "14:00", "16:00", "18:00"].map((time) => <span key={time}>{time}</span>)}</div>{days.map((day, index) => <div className="day-column" key={day}>{bookings.filter((item) => item.day === index).map((item) => <button className={`booking booking--${item.tone}`} key={item.title} style={{ top: `${item.top}%`, height: `${item.height}%` }}><strong>{item.title}</strong><span>{item.meta}</span><StatusBadge>Confirmada</StatusBadge></button>)}</div>)}</div></section>
    <Modal open={open} onClose={() => setOpen(false)} title="Crear reserva" description="Bloquea capacidad para una fecha y vehículo específicos." wide><EntityForm fields={fields} onCancel={() => setOpen(false)} onSubmit={() => { toast.success("Reserva creada y capacidad bloqueada"); setOpen(false); }} submitLabel="Crear reserva" /></Modal>
  </div>;
}
