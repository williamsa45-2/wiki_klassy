const formatoFechaHora = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
const formatoFecha = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' });

export const fechaHora = (iso: string | null | undefined) => (iso ? formatoFechaHora.format(new Date(iso)) : '—');
export const fecha = (iso: string | null | undefined) => (iso ? formatoFecha.format(new Date(iso)) : '—');

export function tamanoLegible(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** «vence en 1 h 42 min» para los accesos temporales; negativo = ya venció. */
export function tiempoRestante(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 'venció';
  const min = Math.round(ms / 60_000);
  if (min < 60) return `vence en ${min} min`;
  const horas = Math.floor(min / 60);
  if (horas < 48) return `vence en ${horas} h ${min % 60} min`;
  return `vence en ${Math.round(horas / 24)} días`;
}
