import { Request, Response } from 'express';
import { listarActividad } from '../services/actividad.service';
import { orientar } from '../services/asistente.service';

export async function orientarPregunta(req: Request, res: Response) {
  res.json(await orientar(req.user!, req.body.pregunta, req.body.ubicacion));
}

export async function actividad(req: Request, res: Response) {
  res.json(await listarActividad(Number(req.query.limite) || 100));
}
