import { useState, type FormEvent } from 'react';
import { ShieldCheck, Truck } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui';
import { authService, type AuthUser } from '@/services/auth.service';

export function LoginPage({ onLogin }: { onLogin: (user: AuthUser) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);

    try {
      const user = await authService.login({ email, password, remember });
      toast.success(`Bienvenido, ${user.fullName}`);
      onLogin(user);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-brand">
          <div className="brand-mark"><span /></div>
          <div>
            <strong>RUTA RD</strong>
            <small>TMS Control tower</small>
          </div>
        </div>
        <div className="auth-copy">
          <span><ShieldCheck size={16} /> Acceso seguro</span>
          <h1>Conecta operaciones, tracking y pagos desde una sola torre.</h1>
          <p>Ingresa con una cuenta ADMIN u OPERATOR para administrar el TMS.</p>
        </div>
        <form onSubmit={submit} className="auth-form">
          <label>
            <span>Correo</span>
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="admin@rutard.local" required />
          </label>
          <label>
            <span>Contraseña</span>
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" minLength={8} required />
          </label>
          <label className="auth-check">
            <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} />
            <span>Mantener sesión en este equipo</span>
          </label>
          <Button type="submit" disabled={loading}>{loading ? 'Entrando...' : 'Entrar al TMS'}</Button>
        </form>
      </section>
      <aside className="auth-side">
        <Truck size={34} />
        <span>Las ubicaciones de conductores se reciben por canal realtime y se sincronizan con órdenes activas.</span>
      </aside>
    </main>
  );
}
