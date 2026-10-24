import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Actividad, EstadoUsuario, Permiso, Rol, TipoArchivo, Usuario, Vigencia } from '../types/api';

export function useUsuarios(estado?: EstadoUsuario) {
  return useQuery({ queryKey: ['usuarios', estado ?? 'todos'], queryFn: () => api.get<Usuario[]>(`/usuarios${estado ? `?estado=${estado}` : ''}`) });
}

function useInvalidarUsuarios() {
  const queryClient = useQueryClient();
  return () => void queryClient.invalidateQueries({ queryKey: ['usuarios'] });
}

export function useAprobarSolicitud() {
  const invalidar = useInvalidarUsuarios();
  return useMutation({ mutationFn: ({ id, ...vigencia }: { id: string } & Vigencia) => api.post(`/usuarios/${id}/aprobar`, vigencia), onSuccess: invalidar });
}

export function useRechazarSolicitud() {
  const invalidar = useInvalidarUsuarios();
  return useMutation({ mutationFn: (id: string) => api.post(`/usuarios/${id}/rechazar`), onSuccess: invalidar });
}

export function useCambiarEstado() {
  const invalidar = useInvalidarUsuarios();
  return useMutation({ mutationFn: ({ id, estado }: { id: string; estado: 'ACTIVO' | 'INACTIVO' }) => api.patch(`/usuarios/${id}/estado`, { estado }), onSuccess: invalidar });
}

export function useCambiarRol() {
  const invalidar = useInvalidarUsuarios();
  return useMutation({ mutationFn: ({ id, rol }: { id: string; rol: Rol }) => api.patch(`/usuarios/${id}/rol`, { rol }), onSuccess: invalidar });
}

export function useFijarAccesoHasta() {
  const invalidar = useInvalidarUsuarios();
  return useMutation({
    mutationFn: ({ id, ...vigencia }: { id: string } & Vigencia) => api.patch(`/usuarios/${id}/acceso-hasta`, { duracion_minutos: vigencia.duracion_minutos ?? null, hasta: vigencia.hasta ?? null }),
    onSuccess: invalidar,
  });
}

export function useRestablecerPassword() {
  return useMutation({ mutationFn: ({ id, password }: { id: string; password: string }) => api.post(`/usuarios/${id}/password`, { password }) });
}

export function usePermisos(usuarioId: string | undefined) {
  return useQuery({ queryKey: ['permisos', usuarioId], queryFn: () => api.get<Permiso[]>(`/usuarios/${usuarioId}/permisos`), enabled: !!usuarioId, staleTime: 0 });
}

function useInvalidarPermisos() {
  const queryClient = useQueryClient();
  return () => void queryClient.invalidateQueries({ queryKey: ['permisos'] });
}

export interface DatosPermiso extends Vigencia {
  seccion_id: string | null;
  descargar: boolean;
  tipos: TipoArchivo[];
  nota: string;
}

export function useOtorgarPermiso() {
  const invalidar = useInvalidarPermisos();
  return useMutation({ mutationFn: ({ usuarioId, ...d }: DatosPermiso & { usuarioId: string }) => api.post(`/usuarios/${usuarioId}/permisos`, d), onSuccess: invalidar });
}

export function useActualizarPermiso() {
  const invalidar = useInvalidarPermisos();
  return useMutation({ mutationFn: ({ id, ...d }: { id: string; descargar?: boolean } & Vigencia) => api.patch(`/permisos/${id}`, d), onSuccess: invalidar });
}

export function useRevocarPermiso() {
  const invalidar = useInvalidarPermisos();
  return useMutation({ mutationFn: (id: string) => api.post(`/permisos/${id}/revocar`), onSuccess: invalidar });
}

export function useActividad() {
  return useQuery({ queryKey: ['actividad'], queryFn: () => api.get<Actividad[]>('/actividad?limite=200'), staleTime: 0 });
}
