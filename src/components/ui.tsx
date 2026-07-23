import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, Download, MoreHorizontal, Search, X } from "lucide-react";
import { useForm, type Resolver } from "react-hook-form";
import { z } from "zod";
import type { Column, DataRow, FilterConfig, FormField, Stat, Tone } from "@/types/domain";

export function Button({ children, variant = "primary", className = "", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger" }) {
  return <button className={`button button--${variant} ${className}`} {...props}>{children}</button>;
}

export function StatusBadge({ children }: { children: ReactNode }) {
  const text = String(children);
  const good = /activa|disponible|entregada|confirmada|resuelta|aprobada|validado|vip|pagado/i.test(text);
  const bad = /incidencia|atrasada|crítica|riesgo|rechaz|suspend|vencido/i.test(text);
  const warn = /pendiente|recogida|pausa|mantenimiento|revisión|media|alta/i.test(text);
  const tone: Tone = good ? "green" : bad ? "red" : warn ? "orange" : "blue";
  return <span className={`badge badge--${tone}`}>{text}</span>;
}

export function StatCard({ stat }: { stat: Stat }) {
  return (
    <article className="stat-card">
      <span className={`stat-dot stat-dot--${stat.tone}`} />
      <p>{stat.label}</p>
      <strong>{stat.value}</strong>
      {stat.helper && <small>{stat.helper}</small>}
    </article>
  );
}

export function PageHeader({ title, subtitle, action, onAction, onExport }: { title: string; subtitle: string; action?: string; onAction?: () => void; onExport?: () => void }) {
  return (
    <header className="page-header">
      <div><h1>{title}</h1><p>{subtitle}</p></div>
      <div className="page-header__actions">
        {onExport && <Button variant="secondary" onClick={onExport} aria-label="Exportar"><Download size={16} /> <span>Exportar</span></Button>}
        {action && <Button onClick={onAction}>+ {action}</Button>}
      </div>
    </header>
  );
}

export function SearchFilters({ search, onSearch, filters, values = {}, onFilterChange }: { search: string; onSearch: (value: string) => void; filters: Array<string | FilterConfig>; values?: Record<string, string>; onFilterChange?: (name: string, value: string) => void }) {
  return (
    <div className="toolbar">
      <label className="search-field"><Search size={16} /><input value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Buscar en esta vista..." /></label>
      <div className="filter-row">
        {filters.map((filter) => typeof filter === "string" ? <button key={filter} className="filter-chip" type="button">{filter}<ChevronDown size={13} /></button> : <label key={filter.name} className="filter-chip filter-chip--select"><span>{filter.label}</span><select value={values[filter.name] ?? ""} onChange={(event) => onFilterChange?.(filter.name, event.target.value)}><option value="">Todos</option>{filter.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>)}
      </div>
    </div>
  );
}

export function DataTable({ columns, rows, onView, onEdit, onDelete }: { columns: Column[]; rows: DataRow[]; onView: (row: DataRow) => void; onEdit: (row: DataRow) => void; onDelete: (row: DataRow) => void }) {
  const [menu, setMenu] = useState<string | null>(null);
  return (
    <div className="table-shell">
      <div className="table-scroll">
        <table>
          <thead><tr>{columns.map((column) => <th key={column.key}>{column.label}</th>)}<th aria-label="Acciones" /></tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} onDoubleClick={() => onView(row)}>
                {columns.map((column) => {
                  const value = row[column.key];
                  return <td key={column.key}>{column.type === "status" ? <StatusBadge>{value}</StatusBadge> : column.type === "money" ? `RD$ ${Number(value).toLocaleString("es-DO")}` : column.type === "strong" ? <strong>{value}</strong> : value}</td>;
                })}
                <td className="row-action">
                  <TableActionsMenu row={row} open={menu === row.id} onOpenChange={(open) => setMenu(open ? row.id : null)} onView={onView} onEdit={onEdit} onDelete={onDelete} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!rows.length && <div className="empty-state"><Search size={24} /><strong>Sin resultados</strong><span>Prueba con otra búsqueda o limpia los filtros.</span></div>}
      <footer className="table-footer"><span>Mostrando {rows.length} registros</span><div><button disabled>Anterior</button><button className="is-current">1</button><button>Siguiente</button></div></footer>
    </div>
  );
}

function TableActionsMenu({ row, open, onOpenChange, onView, onEdit, onDelete }: { row: DataRow; open: boolean; onOpenChange: (open: boolean) => void; onView: (row: DataRow) => void; onEdit: (row: DataRow) => void; onDelete: (row: DataRow) => void }) {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!open || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const menuWidth = 150;
    const menuHeight = 118;
    const top = rect.bottom + 8 + menuHeight > window.innerHeight ? rect.top - menuHeight - 8 : rect.bottom + 8;
    const left = Math.max(8, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 8));
    setPosition({ top: Math.max(8, top), left });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const closeOnPointer = (event: MouseEvent) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      onOpenChange(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };
    const closeOnResize = () => onOpenChange(false);
    window.addEventListener("mousedown", closeOnPointer);
    window.addEventListener("keydown", closeOnEscape);
    window.addEventListener("resize", closeOnResize);
    return () => {
      window.removeEventListener("mousedown", closeOnPointer);
      window.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("resize", closeOnResize);
    };
  }, [onOpenChange, open]);

  const run = (action: (row: DataRow) => void) => {
    action(row);
    onOpenChange(false);
  };

  return <>
    <button ref={buttonRef} onClick={(event) => { event.stopPropagation(); onOpenChange(!open); }} aria-haspopup="menu" aria-expanded={open} aria-label={`Acciones para ${row.id}`}><MoreHorizontal size={17} /></button>
    {open && createPortal(<div ref={menuRef} className="row-menu row-menu--portal" role="menu" style={{ position: "fixed", top: position.top, left: position.left, right: "auto", zIndex: 1000 }}><button role="menuitem" onClick={() => run(onView)}>Ver detalle</button><button role="menuitem" onClick={() => run(onEdit)}>Editar</button><button role="menuitem" className="danger-text" onClick={() => run(onDelete)}>Eliminar</button></div>, document.body)}
  </>;
}

export function Modal({ open, onClose, title, description, children, wide = false }: { open: boolean; onClose: () => void; title: string; description?: string; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);
  return <AnimatePresence>{open && <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}><motion.section className={`modal ${wide ? "modal--wide" : ""}`} initial={{ opacity: 0, y: 18, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10 }} onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true"><header><div><h2>{title}</h2>{description && <p>{description}</p>}</div><button onClick={onClose} aria-label="Cerrar"><X size={20} /></button></header>{children}</motion.section></motion.div>}</AnimatePresence>;
}

type FormValues = Record<string, string>;

export function EntityForm({ fields, initial, submitLabel = "Guardar", onSubmit, onCancel }: { fields: FormField[]; initial?: DataRow; submitLabel?: string; onSubmit: (values: FormValues) => void; onCancel: () => void }) {
  const shape = useMemo(() => Object.fromEntries(fields.map((field) => {
    const base = field.type === "email" ? z.string().email("Correo inválido") : z.string();
    return [field.name, field.required === false ? base.optional() : base.min(1, "Este campo es requerido")];
  })), [fields]);
  const schema = useMemo(() => z.object(shape), [shape]);
  const defaults = useMemo(() => Object.fromEntries(fields.map((field) => [field.name, String(initial?.[field.name] ?? "")])), [fields, initial]);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({ resolver: zodResolver(schema) as Resolver<FormValues>, defaultValues: defaults });
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="form-grid">
        {fields.map((field) => <label key={field.name} className={field.type === "textarea" ? "span-2" : ""}><span>{field.label}{field.required === false ? " (opcional)" : ""}</span>{field.type === "select" ? <select {...register(field.name)}><option value="">Seleccionar</option>{field.options?.map((option) => { const normalized = normalizeOption(option); return <option key={normalized.value} value={normalized.value}>{normalized.label}</option>; })}</select> : field.type === "textarea" ? <textarea rows={3} placeholder={field.placeholder} {...register(field.name)} /> : <input type={field.type ?? "text"} placeholder={field.placeholder} {...register(field.name)} />}{errors[field.name] && <small className="field-error">{String(errors[field.name]?.message)}</small>}</label>)}
      </div>
      <div className="form-summary"><span><Check size={16} /> Validación automática activa</span><strong>Los cambios quedarán registrados en auditoría.</strong></div>
      <footer className="modal-actions"><Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button><Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Guardando..." : submitLabel}</Button></footer>
    </form>
  );
}

export function Drawer({ row, onClose }: { row: DataRow | null; onClose: () => void }) {
  return <AnimatePresence>{row && <><motion.div className="drawer-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} /><motion.aside className="drawer" initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 30, stiffness: 280 }}><header><div><span className="eyebrow">Vista de detalle</span><h2>{displayName(row)}</h2></div><button onClick={onClose}><X size={20} /></button></header><nav className="drawer-tabs"><button className="active">General</button><button>Actividad</button><button>Documentos</button><button>Auditoría</button></nav><div className="drawer-body">{Object.entries(row).filter(([key]) => !isInternalField(key)).map(([key, value]) => <div className="detail-field" key={key}><span>{key.replace(/_/g, " ")}</span><strong>{String(value)}</strong></div>)}</div><footer><Button variant="secondary">Ver historial</Button><Button onClick={onClose}>Cerrar</Button></footer></motion.aside></>}</AnimatePresence>;
}

export function ConfirmDialog({ row, onCancel, onConfirm }: { row: DataRow | null; onCancel: () => void; onConfirm: () => void }) {
  return <Modal open={Boolean(row)} onClose={onCancel} title="Confirmar eliminación" description="Esta acción no se puede deshacer."><div className="confirm-copy">¿Deseas eliminar <strong>{row ? displayName(row) : "este registro"}</strong>? El evento quedará registrado en auditoría.</div><footer className="modal-actions"><Button variant="secondary" onClick={onCancel}>Conservar</Button><Button variant="danger" onClick={onConfirm}>Sí, eliminar</Button></footer></Modal>;
}

function normalizeOption(option: string | { label: string; value: string }) {
  return typeof option === "string" ? { label: option, value: option } : option;
}

function isInternalField(key: string) {
  return key === "_id" || key === "entityId" || /(^|_)\w*Id$/.test(key);
}

function displayName(row: DataRow) {
  return String(row.orden ?? row.cliente ?? row.nombre ?? row.placa ?? row.usuario ?? row.id);
}
