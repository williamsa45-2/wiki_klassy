import type { ReactNode } from 'react';
import type { EstadoUsuario, Permiso, Rol } from '../../types/api';

type Tone = 'primary' | 'success' | 'warning' | 'danger' | 'neutral';

const TONE_CLASSES: Record<Tone, string> = {
  primary: 'bg-primary-soft text-primary',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  neutral: 'bg-soft text-muted',
};

export function Chip({ children, tone = 'neutral' }: { children: ReactNode; tone?: Tone }) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${TONE_CLASSES[tone]}`}>{children}</span>
  );
}

export function RolChip({ rol }: { rol: Rol }) {
  return <Chip tone={rol === 'ADMIN' ? 'primary' : 'neutral'}>{rol === 'ADMIN' ? 'Administrador' : 'Usuario'}</Chip>;
}

const ESTADO_USUARIO: Record<EstadoUsuario, { tone: Tone; texto: string }> = {
  PENDIENTE: { tone: 'warning', texto: 'Pendiente' },
  ACTIVO: { tone: 'success', texto: 'Activo' },
  INACTIVO: { tone: 'neutral', texto: 'Suspendido' },
  RECHAZADO: { tone: 'danger', texto: 'Rechazado' },
};

export function EstadoUsuarioChip({ estado }: { estado: EstadoUsuario }) {
  const { tone, texto } = ESTADO_USUARIO[estado];
  return <Chip tone={tone}>{texto}</Chip>;
}

const ESTADO_PERMISO: Record<Permiso['estado'], { tone: Tone; texto: string }> = {
  VIGENTE: { tone: 'success', texto: 'Vigente' },
  VENCIDO: { tone: 'warning', texto: 'Vencido' },
  REVOCADO: { tone: 'danger', texto: 'Revocado' },
  PROGRAMADO: { tone: 'primary', texto: 'Programado' },
};

export function EstadoPermisoChip({ estado }: { estado: Permiso['estado'] }) {
  const { tone, texto } = ESTADO_PERMISO[estado];
  return <Chip tone={tone}>{texto}</Chip>;
}
