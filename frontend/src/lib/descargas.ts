import type { Documento } from '../types/api';
import { api } from './api';

/** Descarga con sesión: el servidor exige el permiso de descarga (ver no basta). */
export async function descargarArchivo(doc: Pick<Documento, 'id' | 'nombre_archivo'>): Promise<void> {
  const blob = await api.blob(`/documentos/${doc.id}/archivo?descargar=1`);
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = doc.nombre_archivo;
  document.body.append(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
