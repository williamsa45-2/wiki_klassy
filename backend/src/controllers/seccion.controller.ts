import { Request, Response } from 'express';
import { ACCIONES_ACTIVIDAD } from '../constants/enums';
import { registrarActividad } from '../services/actividad.service';
import * as secciones from '../services/seccion.service';

export async function listar(req: Request, res: Response) {
  res.json(await secciones.listarSecciones(req.user!));
}

export async function crear(req: Request, res: Response) {
  const seccion = await secciones.crearSeccion(req.body);
  await registrarActividad(req, { accion: ACCIONES_ACTIVIDAD.SECCION_CREADA, detalle: seccion.nombre });
  res.status(201).json({ id: seccion.id });
}

export async function actualizar(req: Request, res: Response) {
  const { nombre, cambios } = await secciones.actualizarSeccion(String(req.params.id), req.body);
  if (cambios.length) await registrarActividad(req, { accion: ACCIONES_ACTIVIDAD.SECCION_ACTUALIZADA, detalle: `${nombre}: cambió ${cambios.join(', ')}` });
  res.status(204).end();
}

export async function eliminar(req: Request, res: Response) {
  const { nombre } = await secciones.eliminarSeccion(String(req.params.id));
  await registrarActividad(req, { accion: ACCIONES_ACTIVIDAD.SECCION_ELIMINADA, detalle: nombre });
  res.status(204).end();
}
