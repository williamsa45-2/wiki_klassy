import { Request, Response } from 'express';
import { ACCIONES_ACTIVIDAD } from '../constants/enums';
import { registrarActividad } from '../services/actividad.service';
import * as auth from '../services/auth.service';
import ApiError from '../utils/ApiError';

export async function registro(req: Request, res: Response) {
  try {
    await auth.solicitarRegistro(req.body);
  } catch (error) {
    // Misma respuesta exista o no el correo: no se puede averiguar quién tiene cuenta.
    if (!(error instanceof ApiError && error.statusCode === 409)) throw error;
  }
  res.status(201).json({ message: 'Solicitud recibida. Un administrador la revisará; podrás entrar cuando la apruebe.' });
}

export async function login(req: Request, res: Response) {
  const resultado = await auth.iniciarSesion(req.body.email, req.body.password);
  await registrarActividad(req, { accion: ACCIONES_ACTIVIDAD.LOGIN, usuarioId: resultado.usuario.id });
  res.json(resultado);
}

export function yo(req: Request, res: Response) {
  res.json(auth.vistaUsuario(req.user!));
}

export async function cambiarPassword(req: Request, res: Response) {
  res.json(await auth.cambiarPassword(req.user!, req.body.actual, req.body.nueva));
}
