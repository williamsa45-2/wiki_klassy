import { Request, Response } from 'express';
import * as secciones from '../services/seccion.service';

export async function listar(req: Request, res: Response) {
  res.json(await secciones.listarSecciones(req.user!));
}

export async function crear(req: Request, res: Response) {
  res.status(201).json(await secciones.crearSeccion(req.body));
}

export async function actualizar(req: Request, res: Response) {
  await secciones.actualizarSeccion(String(req.params.id), req.body);
  res.status(204).end();
}

export async function eliminar(req: Request, res: Response) {
  await secciones.eliminarSeccion(String(req.params.id));
  res.status(204).end();
}
