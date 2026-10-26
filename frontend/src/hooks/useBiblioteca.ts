import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Actividad, Documento, Seccion, TipoArchivo } from '../types/api';

export interface FiltrosDocumentos {
  q?: string;
  seccion_id?: string;
  tipo?: TipoArchivo | '';
}

export function useSecciones() {
  return useQuery({ queryKey: ['secciones'], queryFn: () => api.get<Seccion[]>('/secciones') });
}

export function useDocumentos(filtros: FiltrosDocumentos, enabled = true) {
  const params = new URLSearchParams();
  if (filtros.q) params.set('q', filtros.q);
  if (filtros.seccion_id) params.set('seccion_id', filtros.seccion_id);
  if (filtros.tipo) params.set('tipo', filtros.tipo);
  return useQuery({
    queryKey: ['documentos', filtros],
    queryFn: () => api.get<Documento[]>(`/documentos?${params}`),
    enabled,
  });
}

export function useDocumento(id: string | undefined) {
  return useQuery({ queryKey: ['documentos', 'uno', id], queryFn: () => api.get<Documento>(`/documentos/${id}`), enabled: !!id, staleTime: 0 });
}

// Bajo 'documentos': toda mutación de contenido ya invalida ese prefijo, así el historial se refresca solo.
export function useHistorialDocumento(id: string | undefined, enabled: boolean) {
  return useQuery({ queryKey: ['documentos', 'historial', id], queryFn: () => api.get<Actividad[]>(`/documentos/${id}/historial`), enabled: enabled && !!id, staleTime: 0 });
}

function useInvalidarContenido() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['documentos'] });
    void queryClient.invalidateQueries({ queryKey: ['secciones'] });
    void queryClient.invalidateQueries({ queryKey: ['actividad'] });
  };
}

interface DatosSeccion {
  nombre: string;
  descripcion: string;
  padre_id: string | null;
}

export function useCrearSeccion() {
  const invalidar = useInvalidarContenido();
  return useMutation({ mutationFn: (d: DatosSeccion) => api.post('/secciones', d), onSuccess: invalidar });
}

export function useActualizarSeccion() {
  const invalidar = useInvalidarContenido();
  return useMutation({ mutationFn: ({ id, ...d }: Partial<DatosSeccion> & { id: string }) => api.patch(`/secciones/${id}`, d), onSuccess: invalidar });
}

export function useEliminarSeccion() {
  const invalidar = useInvalidarContenido();
  return useMutation({ mutationFn: (id: string) => api.delete(`/secciones/${id}`), onSuccess: invalidar });
}

export function useSubirDocumento() {
  const invalidar = useInvalidarContenido();
  return useMutation({ mutationFn: (form: FormData) => api.post('/documentos', form), onSuccess: invalidar });
}

export function useActualizarDocumento() {
  const invalidar = useInvalidarContenido();
  return useMutation({
    mutationFn: ({ id, ...d }: { id: string; titulo?: string; descripcion?: string; seccion_id?: string; etiquetas?: string[] }) => api.patch(`/documentos/${id}`, d),
    onSuccess: invalidar,
  });
}

export function useReemplazarArchivo() {
  const invalidar = useInvalidarContenido();
  return useMutation({ mutationFn: ({ id, form }: { id: string; form: FormData }) => api.put(`/documentos/${id}/archivo`, form), onSuccess: invalidar });
}

export function useEliminarDocumento() {
  const invalidar = useInvalidarContenido();
  return useMutation({ mutationFn: (id: string) => api.delete(`/documentos/${id}`), onSuccess: invalidar });
}
