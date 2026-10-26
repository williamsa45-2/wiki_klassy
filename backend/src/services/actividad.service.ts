import { Request } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { env } from '../config/env';
import { ACCIONES_DE_CAMBIO, AccionActividad } from '../constants/enums';

interface UsuarioDelEvento {
  id: string;
  nombre: string;
  email: string;
}

/** Una línea del archivo. Nombre y correo se copian al escribir: el historial no cambia si luego se edita o borra la cuenta. */
interface Evento {
  fecha: string;
  accion: AccionActividad;
  usuario: UsuarioDelEvento | null;
  documento_id: string | null;
  /** Texto corto legible: nunca contenido de documentos ni contraseñas. */
  detalle: string;
  ip: string;
}

interface Datos {
  accion: AccionActividad;
  /** Solo hace falta cuando aún no hay sesión (inicio de sesión, registro); si no, se toma de `req.user`. */
  usuario?: UsuarioDelEvento;
  documentoId?: string;
  detalle?: string;
}

// Las escrituras van en fila: dos eventos simultáneos nunca intercalan sus bytes en la misma línea.
let cola: Promise<void> = Promise.resolve();

/** El historial nunca debe tumbar la operación que registra: si falla, se anota en consola y se sigue. */
export function registrarActividad(req: Request, datos: Datos): Promise<void> {
  const usuario = datos.usuario ?? (req.user ? { id: String(req.user._id), nombre: req.user.nombre, email: req.user.email } : null);
  const evento: Evento = {
    fecha: new Date().toISOString(),
    accion: datos.accion,
    usuario,
    documento_id: datos.documentoId ?? null,
    detalle: (datos.detalle ?? '').replace(/\s+/g, ' ').slice(0, 300),
    ip: req.ip ?? '',
  };
  cola = cola
    .then(async () => {
      await fs.mkdir(path.dirname(env.archivoHistorial), { recursive: true });
      await fs.appendFile(env.archivoHistorial, JSON.stringify(evento) + '\n', 'utf8');
    })
    .catch((error) => console.error('No se pudo registrar la actividad', error));
  return cola;
}

interface FiltrosActividad {
  soloCambios?: boolean;
  documentoId?: string;
}

/** Lo más reciente primero. Una línea dañada (p. ej. editada a mano) se salta, no rompe la lectura del resto. */
export async function listarActividad(limite = 100, filtros: FiltrosActividad = {}) {
  let contenido = '';
  try {
    contenido = await fs.readFile(env.archivoHistorial, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
  const tope = Math.min(Math.max(limite, 1), 500);
  const lineas = contenido.split('\n');
  const resultado = [];
  for (let i = lineas.length - 1; i >= 0 && resultado.length < tope; i--) {
    const linea = lineas[i] ?? '';
    if (!linea.trim()) continue;
    let evento: Evento;
    try {
      evento = JSON.parse(linea);
    } catch {
      continue;
    }
    if (filtros.soloCambios && !ACCIONES_DE_CAMBIO.includes(evento.accion)) continue;
    if (filtros.documentoId && evento.documento_id !== filtros.documentoId) continue;
    resultado.push({ id: `${i}`, ...evento });
  }
  return resultado;
}
