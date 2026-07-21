import { useEffect, useState } from "react";
import { AppProviders } from "@/app/providers";
import { moduleConfigs } from "@/config/module-configs";
import { AuditPage, ReportsPage, SettingsPage } from "@/features/admin/AdminPages";
import { LoginPage } from "@/features/auth/LoginPage";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { MapPage } from "@/features/map/MapPage";
import { EvidencePage, IncidentsPage, RatesPage } from "@/features/operations/OperationsPages";
import { ReservationsPage } from "@/features/reservations/ReservationsPage";
import { ModulePage } from "@/features/shared/ModulePage";
import { AppShell } from "@/layouts/AppShell";
import { tokenManager } from "@/lib/axios";
import { authService, type AuthUser } from "@/services/auth.service";
import type { ModuleKey } from "@/types/domain";
import "@/styles/globals.css";
import "@/styles/components.css";
import "@/styles/modules.css";
import "@/styles/modules-extra.css";
import "@/styles/responsive.css";

function Portal({ user, onLogout }: { user: AuthUser; onLogout: () => void }) {
  const [active, setActive] = useState<ModuleKey>("dashboard");
  let page;
  if (active === "dashboard") page = <DashboardPage onNavigate={setActive} onNewOrder={() => setActive("orders")} />;
  else if (active === "reservations") page = <ReservationsPage />;
  else if (active === "map") page = <MapPage />;
  else if (active === "rates") page = <RatesPage />;
  else if (active === "incidents") page = <IncidentsPage />;
  else if (active === "evidence") page = <EvidencePage />;
  else if (active === "reports") page = <ReportsPage />;
  else if (active === "audit") page = <AuditPage />;
  else if (active === "settings") page = <SettingsPage />;
  else {
    const config = moduleConfigs[active];
    page = config ? <ModulePage config={config} /> : null;
  }
  return <AppShell active={active} onNavigate={setActive} user={user} onLogout={onLogout}>{page}</AppShell>;
}

function AuthenticatedApp() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [checking, setChecking] = useState(Boolean(tokenManager.get()));

  useEffect(() => {
    if (!tokenManager.get()) {
      return;
    }

    let active = true;
    authService.me()
      .then((nextUser) => active && setUser(nextUser))
      .catch(() => tokenManager.clear())
      .finally(() => active && setChecking(false));

    return () => {
      active = false;
    };
  }, []);

  const logout = async () => {
    await authService.logout();
    setUser(null);
  };

  if (checking) {
    return <div className="boot-screen">Validando sesión TMS...</div>;
  }

  if (!user) {
    return <LoginPage onLogin={setUser} />;
  }

  return <Portal user={user} onLogout={logout} />;
}

export default function App() {
  return <AppProviders><AuthenticatedApp /></AppProviders>;
}
