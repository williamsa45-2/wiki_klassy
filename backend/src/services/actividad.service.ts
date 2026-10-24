import { Request } from 'express';
import { Types } from 'mongoose';
import { AccionActividad } from '../constants/enums';
import Actividad from '../models/actividad.model';

interface Datos {
  accion: AccionActividad;
  usuarioId?: Types.ObjectId | string;
  documentoId?: Types.ObjectId | string;
  detalle?: string;
}

/** La bitácora nunca debe tumbar la operación que registra: si falla, se anota en consola y se sigue. */
export async function registrarActividad(req: Request, datos: Datos): Promise<void> {
  try {
    await Actividad.create({
      accion: datos.accion,
      usuario_id: datos.usuarioId ?? req.user?._id ?? null,
      documento_id: datos.documentoId ?? null,
      detalle: (datos.detalle ?? '').slice(0, 300),
      ip: req.ip ?? '',
    });
  } catch (error) {
    console.error('No se pudo registrar la actividad', error);
  }
}

export async function listarActividad(limite = 100) {
  const filas = await Actividad.find()
    .sort({ createdAt: -1 })
    .limit(Math.min(Math.max(limite, 1), 500))
    .populate('usuario_id', 'nombre email')
    .populate('documento_id', 'titulo')
    .lean();
  return filas.map((f) => {
    const usuario = f.usuario_id as unknown as { _id: unknown; nombre: string; email: string } | null;
    const documento = f.documento_id as unknown as { _id: unknown; titulo: string } | null;
    return {
      id: String(f._id),
      accion: f.accion,
      detalle: f.detalle,
      ip: f.ip,
      fecha: f.createdAt,
      usuario: usuario ? { id: String(usuario._id), nombre: usuario.nombre, email: usuario.email } : null,
      documento: documento ? { id: String(documento._id), titulo: documento.titulo } : null,
    };
  });
}
