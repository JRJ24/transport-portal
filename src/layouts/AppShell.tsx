import { useState, type ReactNode } from "react";
import { Bell, LogOut, Menu, Search, Wifi, X } from "lucide-react";
import { navigation } from "@/config/navigation";
import type { AuthUser } from "@/services/auth.service";
import type { ModuleKey } from "@/types/domain";

export function AppShell({ active, onNavigate, user, onLogout, children }: { active: ModuleKey; onNavigate: (key: ModuleKey) => void; user: AuthUser; onLogout: () => void; children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = (key: ModuleKey) => { onNavigate(key); setMobileOpen(false); };
  const initials = user.fullName.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "TM";
  return (
    <div className="app-shell">
      {mobileOpen && <button className="mobile-scrim" aria-label="Cerrar navegación" onClick={() => setMobileOpen(false)} />}
      <aside className={`sidebar ${mobileOpen ? "is-open" : ""}`}>
        <div className="brand"><div className="brand-mark"><span /></div><div><strong>RUTA RD</strong><small>Control tower</small></div><button className="mobile-close" onClick={() => setMobileOpen(false)}><X size={18} /></button></div>
        <nav>{navigation.map((item) => <button key={item.key} className={active === item.key ? "active" : ""} onClick={() => navigate(item.key)}><item.icon size={18} strokeWidth={1.8} /><span>{item.label}</span>{item.key === "incidents" && <em>3</em>}</button>)}</nav>
        <div className="sidebar-status"><span><Wifi size={15} /> Estado operativo</span><strong>Online · 98.7% GPS</strong><small>Última sincronización: ahora</small></div>
        <button className="sidebar-user" onClick={onLogout}><div className="avatar">{initials}</div><div><strong>{user.fullName}</strong><small>{user.roles.join(" · ")}</small></div><LogOut size={15} /></button>
      </aside>
      <main className="main-area">
        <div className="topbar">
          <button className="menu-toggle" onClick={() => setMobileOpen(true)}><Menu size={20} /></button>
          <label className="global-search"><Search size={16} /><input placeholder="Buscar orden, cliente, conductor..." /><kbd>⌘ K</kbd></label>
          <div className="topbar-actions"><button className="icon-button"><Bell size={18} /><span className="notification-dot" /></button><div className="avatar avatar--light">{initials}</div></div>
        </div>
        <div className="page-content">{children}</div>
      </main>
    </div>
  );
}
