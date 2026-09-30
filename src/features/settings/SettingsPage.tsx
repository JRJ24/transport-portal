import { useDeferredValue, useMemo, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, Bell, Gauge, Receipt, RefreshCw, Users } from "lucide-react";
import { toast } from "sonner";
import { Button, DataTable, Modal, PageHeader, StatusBadge } from "@/components/ui";
import { label } from "@/lib/labels";
import { queryKeys } from "@/lib/query-keys";
import { tmsService, type AnyRecord, type RuntimeSetting } from "@/services/tms.service";
import type { DataRow } from "@/types/domain";

type Tab = "dispatch" | "pricing" | "users" | "status" | "notifications";

const TABS: { id: Tab; label: string; icon: typeof Gauge }[] = [
  { id: "dispatch", label: "Despacho", icon: Gauge },
  { id: "pricing", label: "Tarifa dinámica e impuestos", icon: Receipt },
  { id: "users", label: "Usuarios y roles", icon: Users },
  { id: "status", label: "Estado del sistema", icon: Activity },
  { id: "notifications", label: "Notificaciones", icon: Bell },
];

const ROLE_OPTIONS = ["ADMIN", "OPERATOR", "DRIVER", "CUSTOMER"];

function apiError(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : "";
  if (/Invalid value/i.test(message)) return `Valor no válido: ${message.replace(/^Invalid value for [^:]+:\s*/i, "")}`;
  return message || fallback;
}

/** Configuracion que cambia el comportamiento en segundos, sin desplegar. */
export function SettingsPage() {
  const [tab, setTab] = useState<Tab>("dispatch");

  return (
    <div>
      <PageHeader title="Configuración" subtitle="Cambios en vivo: se aplican en segundos y quedan en auditoría." />
      <div className="settings-shell">
        <nav className="settings-tabs" aria-label="Secciones de configuración">
          {TABS.map((item) => (
            <button key={item.id} type="button" className={tab === item.id ? "active" : ""} aria-current={tab === item.id ? "page" : undefined} onClick={() => setTab(item.id)}>
              <item.icon size={16} /> {item.label}
            </button>
          ))}
        </nav>
        <div className="settings-content">
          {tab === "dispatch" || tab === "pricing" ? <RuntimeSettingsPanel group={tab} /> : null}
          {tab === "users" ? <UsersPanel /> : null}
          {tab === "status" ? <SystemStatusPanel /> : null}
          {tab === "notifications" ? <NotificationsPanel /> : null}
        </div>
      </div>
    </div>
  );
}

// ── Ajustes en caliente ─────────────────────────────────────────────────────

function RuntimeSettingsPanel({ group }: { group: "dispatch" | "pricing" }) {
  const settingsQuery = useQuery({ queryKey: ["settings", "runtime"], queryFn: () => tmsService.runtimeSettings() });
  const settings = (settingsQuery.data ?? []).filter((setting) => setting.group === group);

  return (
    <div className="settings-cards">
      {settingsQuery.isLoading ? <div className="inline-alert inline-alert--info">Cargando ajustes...</div> : null}
      {settingsQuery.isError ? <div className="inline-alert">{apiError(settingsQuery.error, "No se pudieron cargar los ajustes.")}</div> : null}
      {settings.map((setting) => (
        <SettingCard key={`${setting.key}-${setting.updatedAt ?? "default"}`} setting={setting} />
      ))}
    </div>
  );
}

function SettingCard({ setting }: { setting: RuntimeSetting }) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  const save = async (value: unknown) => {
    setSaving(true);
    try {
      await tmsService.updateRuntimeSetting(setting.key, value);
      await queryClient.invalidateQueries({ queryKey: ["settings", "runtime"] });
      toast.success(`${setting.label}: guardado`);
    } catch (error) {
      toast.error(apiError(error, "No se pudo guardar"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <article className="panel setting-card">
      <header>
        <div>
          <h3>{setting.label}</h3>
          <p>{setting.description}</p>
        </div>
        <small className="setting-source">
          {setting.source === "database"
            ? `Cambiado${setting.updatedBy ? ` por ${setting.updatedBy}` : ""}${setting.updatedAt ? ` · ${new Date(setting.updatedAt).toLocaleString("es-DO")}` : ""}`
            : "Valor por defecto del servidor"}
        </small>
      </header>
      <SettingEditor setting={setting} saving={saving} onSave={(value) => void save(value)} />
    </article>
  );
}

function SettingEditor({ setting, saving, onSave }: { setting: RuntimeSetting; saving: boolean; onSave: (value: unknown) => void }) {
  if (setting.key === "matching.auto_offer") {
    const on = setting.value === true;
    return (
      <div className="setting-row-inline">
        <StatusBadge>{on ? "Activas" : "Apagadas"}</StatusBadge>
        <Button type="button" variant={on ? "danger" : "primary"} disabled={saving} onClick={() => onSave(!on)}>
          {on ? "Apagar ofertas automáticas" : "Encender ofertas automáticas"}
        </Button>
      </div>
    );
  }
  if (setting.key === "pricing.demand.mode") return <DemandModeEditor value={String(setting.value)} saving={saving} onSave={onSave} />;
  if (setting.key === "matching.score.weights") return <WeightsEditor value={setting.value as Record<string, number>} saving={saving} onSave={onSave} />;
  if (setting.key === "pricing.demand.bands") return <BandsEditor value={setting.value as Band[]} saving={saving} onSave={onSave} />;
  if (setting.key === "tax.rate") return <NumberEditor value={Number(setting.value) * 100} suffix="%" min={0} max={30} step={0.5} saving={saving} onSave={(v) => onSave(Math.round(v * 100) / 10000)} />;
  if (setting.key === "matching.offer_ttl_sec") return <NumberEditor value={Number(setting.value)} suffix="segundos" min={10} max={300} step={5} saving={saving} onSave={onSave} />;
  if (setting.key === "matching.max_rings") return <NumberEditor value={Number(setting.value)} suffix={`anillos (≈ ${((Number(setting.value) * 2 + 1) * 0.46).toFixed(1)} km de diámetro)`} min={0} max={8} step={1} saving={saving} onSave={onSave} />;
  return <p className="rate-empty">Sin editor para este ajuste.</p>;
}

function NumberEditor({ value, suffix, min, max, step, saving, onSave }: { value: number; suffix: string; min: number; max: number; step: number; saving: boolean; onSave: (value: number) => void }) {
  const [draft, setDraft] = useState(String(value));
  const number = Number(draft);
  const valid = Number.isFinite(number) && number >= min && number <= max;
  return (
    <form className="setting-row-inline" onSubmit={(event) => { event.preventDefault(); if (valid) onSave(number); }}>
      <input type="number" min={min} max={max} step={step} value={draft} onChange={(event) => setDraft(event.target.value)} />
      <span>{suffix}</span>
      <Button type="submit" disabled={saving || !valid || number === value}>Guardar</Button>
      {!valid ? <small className="field-error">Entre {min} y {max}</small> : null}
    </form>
  );
}

function DemandModeEditor({ value, saving, onSave }: { value: string; saving: boolean; onSave: (value: string) => void }) {
  const options = [
    { id: "off", title: "Apagada", copy: "Siempre precio base." },
    { id: "shadow", title: "En observación", copy: "Se calcula y registra, no se cobra." },
    { id: "on", title: "Activa", copy: "Se cobra el multiplicador." },
  ];
  return (
    <div className="mode-picker" role="radiogroup">
      {options.map((option) => (
        <button key={option.id} type="button" className={value === option.id ? "is-active" : ""} aria-pressed={value === option.id} disabled={saving || value === option.id} onClick={() => onSave(option.id)}>
          <strong>{option.title}</strong>
          <span>{option.copy}</span>
        </button>
      ))}
    </div>
  );
}

const WEIGHT_LABELS: Record<string, string> = {
  eta: "Tiempo de llegada (ETA)",
  distance: "Distancia por carretera",
  reliability: "Fiabilidad (calificación y aceptación)",
  balance: "Balance (viajes del día)",
};

function WeightsEditor({ value, saving, onSave }: { value: Record<string, number>; saving: boolean; onSave: (value: Record<string, number>) => void }) {
  const [draft, setDraft] = useState(() => Object.fromEntries(Object.keys(WEIGHT_LABELS).map((key) => [key, Math.round((value?.[key] ?? 0) * 100)])));
  const total = Object.values(draft).reduce((sum, item) => sum + item, 0);
  return (
    <div className="weights-editor">
      {Object.entries(WEIGHT_LABELS).map(([key, text]) => (
        <label key={key}>
          <span>{text}</span>
          <input type="range" min={0} max={100} value={draft[key]} onChange={(event) => setDraft((current) => ({ ...current, [key]: Number(event.target.value) }))} />
          <strong>{total ? Math.round((draft[key] / total) * 100) : 0} %</strong>
        </label>
      ))}
      <div className="setting-row-inline">
        <small>Se normaliza para sumar 100 %.</small>
        <Button type="button" disabled={saving || total === 0} onClick={() => onSave(Object.fromEntries(Object.entries(draft).map(([key, item]) => [key, item / total])))}>
          Guardar pesos
        </Button>
      </div>
    </div>
  );
}

interface Band {
  above: number;
  multiplier: number;
  label: string;
}

function BandsEditor({ value, saving, onSave }: { value: Band[]; saving: boolean; onSave: (value: Band[]) => void }) {
  const [draft, setDraft] = useState<Band[]>(() => [...(value ?? [])].filter((band) => Number.isFinite(band.above)).sort((a, b) => a.above - b.above));
  const update = (index: number, patch: Partial<Band>) => setDraft((current) => current.map((band, i) => (i === index ? { ...band, ...patch } : band)));
  const valid = draft.every((band) => band.above >= 0 && band.multiplier >= 1 && band.multiplier <= 3 && band.label.trim());
  return (
    <div className="bands-editor">
      <div className="bands-row bands-row--head">
        <span>Solicitudes por conductor, más de</span>
        <span>Multiplicador</span>
        <span>Nombre</span>
        <span />
      </div>
      {draft.map((band, index) => (
        <div className="bands-row" key={index}>
          <input type="number" min={0} step={0.1} value={band.above} onChange={(event) => update(index, { above: Number(event.target.value) })} />
          <input type="number" min={1} max={3} step={0.05} value={band.multiplier} onChange={(event) => update(index, { multiplier: Number(event.target.value) })} />
          <input value={band.label} onChange={(event) => update(index, { label: event.target.value })} />
          <button type="button" onClick={() => setDraft((current) => current.filter((_, i) => i !== index))}>Quitar</button>
        </div>
      ))}
      <div className="setting-row-inline">
        <Button type="button" variant="secondary" onClick={() => setDraft((current) => [...current, { above: (current.at(-1)?.above ?? 0) + 0.5, multiplier: 1.1, label: "NUEVA" }])}>
          + Banda
        </Button>
        <Button type="button" disabled={saving || !valid} onClick={() => onSave([...draft].sort((a, b) => a.above - b.above))}>
          Guardar bandas
        </Button>
      </div>
      <small className="profile-hint">Por debajo de la primera banda el precio es el normal (×1.00).</small>
    </div>
  );
}

// ── Usuarios y roles ────────────────────────────────────────────────────────

const userColumns = [
  { key: "usuario", label: "Usuario", type: "strong" as const },
  { key: "email", label: "Correo" },
  { key: "telefono", label: "Teléfono" },
  { key: "rolesTexto", label: "Roles" },
  { key: "estado", label: "Estado", type: "status" as const },
];

function UsersPanel() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [editing, setEditing] = useState<DataRow | "new" | null>(null);
  const query = useMemo(() => ({ search: deferredSearch }), [deferredSearch]);
  const usersQuery = useQuery({ queryKey: queryKeys.users(query), queryFn: () => tmsService.users(query) });
  const users: DataRow[] = (usersQuery.data ?? []).map((user: AnyRecord) => {
    const roles = Array.isArray(user.roles) ? user.roles.map(String) : [];
    return {
      id: String(user.id),
      usuario: String(user.fullName ?? "—"),
      email: String(user.email ?? "—"),
      telefono: String(user.phone ?? "—"),
      rolesTexto: roles.map((role) => label("role", role)).join(", ") || "—",
      roles: roles.join(","),
      estado: label("accountStatus", user.status),
      estadoInterno: String(user.status ?? ""),
    };
  });

  const setStatus = async (row: DataRow, status: string) => {
    try {
      await tmsService.updateUserStatus(row.id, status);
      await queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success(`${row.usuario}: ${label("accountStatus", status).toLowerCase()}`);
    } catch (error) {
      toast.error(apiError(error, "No se pudo cambiar el estado"));
    }
  };

  return (
    <div className="settings-users">
      <div className="setting-row-inline settings-users__bar">
        <label className="search-field">
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar usuario por nombre, correo o teléfono..." />
        </label>
        <Button type="button" onClick={() => setEditing("new")}>+ Nuevo usuario</Button>
      </div>
      {usersQuery.isError ? <div className="inline-alert">No se pudieron cargar los usuarios.</div> : null}
      <DataTable
        columns={userColumns}
        rows={users}
        onView={(row) => setEditing(row)}
        onEdit={(row) => setEditing(row)}
        onDelete={(row) => void setStatus(row, row.estadoInterno === "ACTIVE" ? "INACTIVE" : "ACTIVE")}
      />
      <small className="profile-hint">"Eliminar" en el menú de cada fila desactiva (o reactiva) la cuenta: nunca se borra, para conservar la auditoría.</small>
      {editing ? <UserModal key={editing === "new" ? "new" : editing.id} user={editing === "new" ? null : editing} onClose={() => setEditing(null)} /> : null}
    </div>
  );
}

function UserModal({ user, onClose }: { user: DataRow | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const initialRoles = user ? String(user.roles).split(",").filter(Boolean) : ["OPERATOR"];
  const [values, setValues] = useState({
    fullName: String(user?.usuario ?? ""),
    email: String(user?.email ?? ""),
    phone: String(user?.telefono ?? ""),
    password: "",
    status: String(user?.estadoInterno ?? "ACTIVE"),
  });
  const [roles, setRoles] = useState<string[]>(initialRoles);
  const [saving, setSaving] = useState(false);
  const set = (key: keyof typeof values, value: string) => setValues((current) => ({ ...current, [key]: value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!roles.length) {
      toast.error("Asigna al menos un rol");
      return;
    }
    setSaving(true);
    try {
      if (!user) {
        await tmsService.createUser({ ...values, roles: roles.join(",") });
      } else {
        await tmsService.updateUser(user.id, { fullName: values.fullName.trim(), phone: values.phone.replace(/[\s-]/g, "") });
        for (const role of roles.filter((role) => !initialRoles.includes(role))) await tmsService.assignRole(user.id, role);
        for (const role of initialRoles.filter((role) => !roles.includes(role))) await tmsService.revokeRole(user.id, role);
        if (values.status !== user.estadoInterno) await tmsService.updateUserStatus(user.id, values.status);
      }
      await queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success(user ? "Usuario actualizado" : "Usuario creado");
      onClose();
    } catch (error) {
      toast.error(apiError(error, "No se pudo guardar el usuario"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={user ? `Editar ${user.usuario}` : "Nuevo usuario"} description="Los roles definen qué puede hacer en el TMS y en las apps." wide>
      <form onSubmit={(event) => void submit(event)}>
        <div className="form-grid">
          <label className="span-2"><span>Nombre completo</span><input value={values.fullName} onChange={(event) => set("fullName", event.target.value)} /></label>
          <label><span>Correo</span><input type="email" disabled={Boolean(user)} value={values.email} onChange={(event) => set("email", event.target.value)} /></label>
          <label><span>Teléfono</span><input value={values.phone} onChange={(event) => set("phone", event.target.value)} placeholder="+18095551234" /></label>
          {!user ? <label className="span-2"><span>Contraseña temporal</span><input type="text" value={values.password} onChange={(event) => set("password", event.target.value)} /></label> : null}
          {user ? (
            <label className="span-2">
              <span>Estado de la cuenta</span>
              <select value={values.status} onChange={(event) => set("status", event.target.value)}>
                <option value="ACTIVE">Activo</option>
                <option value="INACTIVE">Inactivo</option>
                <option value="BLOCKED">Bloqueado</option>
              </select>
            </label>
          ) : null}
          <fieldset className="span-2 role-picker">
            <legend>Roles</legend>
            {ROLE_OPTIONS.map((role) => (
              <label key={role}>
                <input type="checkbox" checked={roles.includes(role)} onChange={(event) => setRoles((current) => (event.target.checked ? [...current, role] : current.filter((item) => item !== role)))} />
                {label("role", role)}
              </label>
            ))}
          </fieldset>
        </div>
        <footer className="modal-actions">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={saving}>{saving ? "Guardando..." : user ? "Guardar cambios" : "Crear usuario"}</Button>
        </footer>
      </form>
    </Modal>
  );
}

// ── Estado del sistema ──────────────────────────────────────────────────────

function SystemStatusPanel() {
  const statusQuery = useQuery({ queryKey: ["settings", "system-status"], queryFn: () => tmsService.systemStatus(), refetchInterval: 60_000 });
  const data = statusQuery.data;
  const overallText = { ok: "Todo funcionando", warning: "Funciona con avisos", error: "Hay servicios caídos" };
  return (
    <article className="panel system-status">
      <header className="setting-row-inline">
        <div>
          <h3>{data ? overallText[data.overall] : "Comprobando..."}</h3>
          <p>{data ? `Última comprobación ${new Date(data.checkedAt).toLocaleTimeString("es-DO")}` : "Consultando cada servicio"}</p>
        </div>
        <Button type="button" variant="secondary" disabled={statusQuery.isFetching} onClick={() => void statusQuery.refetch()}>
          <RefreshCw size={15} /> Comprobar ahora
        </Button>
      </header>
      {statusQuery.isError ? <div className="inline-alert">{apiError(statusQuery.error, "No se pudo consultar el estado.")}</div> : null}
      <ul className="status-list">
        {(data?.checks ?? []).map((check) => (
          <li key={check.id} className={`is-${check.state}`}>
            <i aria-hidden="true" />
            <div>
              <strong>{check.label}</strong>
              <span>{check.detail}</span>
            </div>
          </li>
        ))}
      </ul>
    </article>
  );
}

// ── Notificaciones ──────────────────────────────────────────────────────────

function NotificationsPanel() {
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [userId, setUserId] = useState("");
  const [message, setMessage] = useState("Prueba de notificación de RUTA RD");
  const [sending, setSending] = useState(false);
  const usersQuery = useQuery({ queryKey: queryKeys.users({ search: deferredSearch }), queryFn: () => tmsService.users({ search: deferredSearch }), enabled: deferredSearch.length >= 2 });

  const send = async () => {
    setSending(true);
    try {
      await tmsService.sendTestNotification(userId, message.trim());
      toast.success("Notificación de prueba enviada");
    } catch (error) {
      toast.error(apiError(error, "No se pudo enviar"));
    } finally {
      setSending(false);
    }
  };

  return (
    <article className="panel setting-card">
      <header>
        <div>
          <h3>Enviar notificación de prueba</h3>
          <p>Comprueba que un usuario recibe avisos push en su teléfono. También queda en su campana.</p>
        </div>
      </header>
      <div className="form-grid">
        <label className="span-2"><span>Buscar usuario</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nombre o correo (mínimo 2 letras)" /></label>
        <label className="span-2">
          <span>Destinatario</span>
          <select value={userId} onChange={(event) => setUserId(event.target.value)}>
            <option value="">Elegir usuario</option>
            {(usersQuery.data ?? []).map((user: AnyRecord) => (
              <option key={String(user.id)} value={String(user.id)}>{String(user.fullName)} · {String(user.email)}</option>
            ))}
          </select>
        </label>
        <label className="span-2"><span>Mensaje</span><input value={message} onChange={(event) => setMessage(event.target.value)} /></label>
      </div>
      <div className="setting-row-inline">
        <Button type="button" disabled={!userId || !message.trim() || sending} onClick={() => void send()}>{sending ? "Enviando..." : "Enviar prueba"}</Button>
      </div>
    </article>
  );
}
