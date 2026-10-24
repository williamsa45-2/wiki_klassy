import { useMutation } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { RespuestaAsistente } from '../types/api';

/** `ubicacion` es dónde está ahora la persona («Historias de usuario / Backend»): ayuda a desambiguar, no limita la búsqueda. */
export function useOrientarAsistente() {
  return useMutation({
    mutationFn: (datos: { pregunta: string; ubicacion: string }) => api.post<RespuestaAsistente>('/asistente/orientar', datos),
  });
}
