import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { AsistenteFlotante } from '../asistente/AsistenteFlotante';
import { RolChip } from '../ui/Chip';
import { ActivityIcon, BookIcon, KeyIcon, LogOutIcon, UserIcon, UsersIcon, UploadIcon } from '../ui/icons';

interface Enlace {
  to: string;
  label: string;
  icon: typeof BookIcon;
  soloAdmin?: boolean;
}

const ENLACES: Enlace[] = [
  { to: '/biblioteca', label: 'Biblioteca', icon: BookIcon },
  { to: '/admin/contenido', label: 'Gestionar contenido', icon: UploadIcon, soloAdmin: true },
  { to: '/admin/usuarios', label: 'Usuarios y permisos', icon: UsersIcon, soloAdmin: true },
  { to: '/admin/actividad', label: 'Actividad', icon: ActivityIcon, soloAdmin: true },
  { to: '/mi-cuenta', label: 'Mi cuenta', icon: KeyIcon },
];

export function AppShell() {
  const { usuario, esAdmin, cerrarSesion } = useAuth();
  const enlaces = ENLACES.filter((e) => !e.soloAdmin || esAdmin);

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="border-b border-border bg-surface md:w-60 md:shrink-0 md:border-b-0 md:border-r">
        <div className="flex items-center justify-between px-5 py-4 md:block">
          <p className="text-h3 text-ink">Wiki Klassy</p>
          <p className="hidden text-xs text-muted md:block">Documentación del proyecto</p>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:pb-0">
          {enlaces.map(({ to, label, icon: Icono }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${isActive ? 'bg-primary-soft text-primary' : 'text-body hover:bg-soft'}`
              }
            >
              <Icono className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="hidden border-t border-border p-4 md:mt-6 md:block">
          <div className="mb-2 flex items-center gap-2 text-sm text-ink">
            <UserIcon className="h-4 w-4 shrink-0 text-muted" />
            <span className="truncate">{usuario?.nombre}</span>
          </div>
          {usuario && <RolChip rol={usuario.rol} />}
          <button type="button" onClick={cerrarSesion} className="mt-3 flex items-center gap-2 text-sm font-semibold text-muted hover:text-danger">
            <LogOutIcon className="h-4 w-4" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-4 py-6 md:px-8">
        <div className="mx-auto max-w-7xl space-y-4">
          <Outlet />
        </div>
      </main>

      <AsistenteFlotante />
    </div>
  );
}
