import { useState } from "react";
import { Activity, Bell, ChevronRight, Cloud, Download, KeyRound, Map, PlugZap, ShieldCheck, Users } from "lucide-react";
import { toast } from "sonner";
import { Button, EntityForm, Modal, PageHeader, StatCard, StatusBadge } from "@/components/ui";

const chartValues = [48, 72, 38, 84, 61, 96, 79];

export function ReportsPage() {
  const exportReport = (name: string) => toast.success(`${name} preparado para descarga`);
  return <div><PageHeader title="Reportes" subtitle="Rendimiento operativo, ingresos y SLA" /><section className="stats-grid"><StatCard stat={{ label: "Ingresos", value: "RD$ 1.2M", helper: "+8.2% este mes", tone: "slate" }} /><StatCard stat={{ label: "OTD", value: "94%", helper: "+2.1% vs. junio", tone: "green" }} /><StatCard stat={{ label: "Costo / km", value: "RD$ 31", helper: "−3.6% este mes", tone: "blue" }} /><StatCard stat={{ label: "Incidencias", value: "3.8%", helper: "Objetivo < 4%", tone: "orange" }} /></section>
    <section className="reports-layout"><article className="panel report-chart"><div className="panel-heading"><div><h2>Entregas por día</h2><p>Semana del 20 al 26 de julio</p></div><div className="segmented"><button className="active">7 días</button><button>30 días</button></div></div><div className="bar-chart">{chartValues.map((value, index) => <div key={index}><span style={{ height: `${value}%` }} className={index === 5 ? "highlight" : ""}><em>{value}</em></span><small>{["L", "M", "X", "J", "V", "S", "D"][index]}</small></div>)}</div></article><aside className="panel export-panel"><div className="panel-heading"><div><h2>Exportar</h2><p>Archivos listos para conciliación</p></div></div>{["Finanzas CSV", "SLA PDF", "Conductores XLS", "Incidencias PDF"].map((name) => <button key={name} onClick={() => exportReport(name)}><Download size={16} /><span>{name}</span><ChevronRight size={15} /></button>)}</aside></section>
    <section className="panel indicators"><div className="panel-heading"><div><h2>Indicadores clave</h2><p>Comparación con el periodo anterior</p></div></div><div><span>SLA de recogida</span><strong>91% cumplimiento</strong><em className="positive">+4.2% vs. semana</em><StatusBadge>Mejora</StatusBadge></div><div><span>Cancelaciones</span><strong>2.1% total</strong><em>−0.8% vs. semana</em><StatusBadge>Bajo</StatusBadge></div><div><span>Utilización de flota</span><strong>82%</strong><em className="positive">+3.6% vs. mes</em><StatusBadge>Óptimo</StatusBadge></div></section></div>;
}

const events = [
  ["09:42", "Tarifa editada", "Laura M. · PRICES / rate_rule"], ["10:16", "Orden cancelada", "Operador 03 · ORD-000119"], ["11:05", "Rol actualizado", "Admin · AUTH / roles"],
  ["12:31", "Evidencia aprobada", "Auditor 01 · EVIDENCES"], ["13:44", "API Maps reconectada", "Sistema · INTEGRATIONS"], ["14:02", "Conductor suspendido", "Laura M. · DRV-031"],
];

export function AuditPage() {
  const [selected, setSelected] = useState(0);
  return <div><PageHeader title="Auditoría" subtitle="Trazabilidad de cambios y eventos críticos" onExport={() => toast.success("Registro de auditoría exportado")} /><section className="stats-grid"><StatCard stat={{ label: "Eventos hoy", value: "342", helper: "12 críticos", tone: "blue" }} /><StatCard stat={{ label: "Cambios tarifa", value: "5", helper: "2 requieren firma", tone: "green" }} /><StatCard stat={{ label: "Accesos admin", value: "18", helper: "Sin anomalías", tone: "slate" }} /><StatCard stat={{ label: "Alertas", value: "2", helper: "IP no reconocida", tone: "red" }} /></section>
    <section className="audit-layout"><article className="panel audit-list"><div className="panel-heading"><div><h2>Registro de eventos</h2><p>Hoy · todas las entidades</p></div></div>{events.map((event, index) => <button className={selected === index ? "selected" : ""} key={event[0]} onClick={() => setSelected(index)}><time>{event[0]}</time><span><strong>{event[1]}</strong><small>{event[2]}</small></span><ChevronRight size={15} /></button>)}</article><aside className="dark-insight audit-change"><span>Cambio seleccionado</span><h3>{events[selected][1]}</h3><p>{events[selected][2]}</p><div><span>Antes</span><strong>RD$ 48/km</strong></div><div><span>Después</span><strong className="green-text">RD$ 52/km</strong></div><div><span>IP</span><strong>190.167.8.24</strong></div><StatusBadge>Requiere firma</StatusBadge></aside></section></div>;
}

const settings = [
  { icon: Users, title: "Roles y permisos", copy: "Despacho, auditoría, finanzas", status: "Editar" },
  { icon: Map, title: "Mapas y GPS", copy: "Google Maps · geocercas", status: "Activo" },
  { icon: Bell, title: "Notificaciones", copy: "SMS, WhatsApp y correo operativo", status: "Editar" },
  { icon: Cloud, title: "Almacenamiento", copy: "S3 · evidencias y documentos", status: "Activo" },
  { icon: PlugZap, title: "Integraciones", copy: "Pagos, webhooks y APIs externas", status: "5 activas" },
  { icon: KeyRound, title: "Seguridad y API Keys", copy: "Credenciales y rotación", status: "Editar" },
];

export function SettingsPage() {
  const [open, setOpen] = useState(false);
  const fields = [{ name: "nombre", label: "Nombre completo" }, { name: "email", label: "Correo", type: "email" as const }, { name: "rol", label: "Rol", type: "select" as const, options: ["Administrador", "Operador", "Auditor", "Finanzas"] }, { name: "estado", label: "Estado", type: "select" as const, options: ["Activo", "Inactivo", "Bloqueado"] }, { name: "permisos", label: "Permisos especiales", type: "textarea" as const }];
  return <div><PageHeader title="Configuración" subtitle="Roles, integraciones y reglas del sistema" action="Nuevo usuario" onAction={() => setOpen(true)} /><section className="stats-grid"><StatCard stat={{ label: "Usuarios", value: "46", helper: "38 activos", tone: "blue" }} /><StatCard stat={{ label: "Roles", value: "8", helper: "4 personalizados", tone: "slate" }} /><StatCard stat={{ label: "Integraciones", value: "5", helper: "Todas operativas", tone: "green" }} /><StatCard stat={{ label: "Alertas", value: "3", helper: "1 credencial vence", tone: "orange" }} /></section>
    <section className="settings-layout"><article className="panel settings-panel"><div className="panel-heading"><div><h2>Panel de configuración</h2><p>Administración del entorno productivo</p></div></div>{settings.map((item) => <button key={item.title} onClick={() => toast.info(`Abriendo ${item.title}`)}><div className="setting-icon"><item.icon size={18} /></div><span><strong>{item.title}</strong><small>{item.copy}</small></span><StatusBadge>{item.status}</StatusBadge><ChevronRight size={15} /></button>)}</article><aside className="system-health"><div className="panel-heading"><div><h2>Estado del sistema</h2><p>Últimos 30 minutos</p></div><Activity size={20} /></div><div className="health-score"><strong>99.98%</strong><span>Disponibilidad</span></div><p><i className="green-dot" /> Todos los servicios funcionan normalmente</p><div><span>API principal</span><strong>124 ms</strong></div><div><span>Base de datos</span><strong>18 ms</strong></div><div><span>GPS / Maps</span><strong>214 ms</strong></div><div><span>Cola de eventos</span><strong>0 pendientes</strong></div><Button variant="secondary"><ShieldCheck size={16} /> Ver seguridad</Button></aside></section>
    <Modal open={open} onClose={() => setOpen(false)} title="Crear usuario" description="Asigna rol, permisos y estado de cuenta." wide><EntityForm fields={fields} onCancel={() => setOpen(false)} onSubmit={() => { toast.success("Usuario creado; invitación enviada"); setOpen(false); }} /></Modal></div>;
}
