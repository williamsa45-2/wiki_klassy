import { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { ESTADOS_USUARIO, ROLES } from '../constants/enums';
import { env } from '../config/env';
import User from '../models/user.model';
import ApiError from '../utils/ApiError';
import catchAsync from '../utils/catchAsync';

interface CargaToken {
  sub: string;
  ver: number;
}

export function firmarToken(userId: string, versionSesion: number): string {
  return jwt.sign({ sub: userId, ver: versionSesion } satisfies CargaToken, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn as jwt.SignOptions['expiresIn'],
  });
}

/** Comprueba la cuenta en cada petición: suspender, vencer o cambiar de rol a alguien surte efecto de inmediato, sin esperar a que caduque su token. */
export function motivoDeBloqueo(user: { estado: string; acceso_hasta: Date | null }, ahora = new Date()): string | null {
  if (user.estado === ESTADOS_USUARIO.PENDIENTE) return 'Tu solicitud aún no ha sido aprobada por un administrador.';
  if (user.estado === ESTADOS_USUARIO.RECHAZADO) return 'Tu solicitud de acceso fue rechazada.';
  if (user.estado !== ESTADOS_USUARIO.ACTIVO) return 'Tu cuenta está suspendida. Habla con un administrador.';
  if (user.acceso_hasta && ahora >= user.acceso_hasta) return 'Tu acceso temporal venció. Pide a un administrador que lo renueve.';
  return null;
}

export const autenticar = catchAsync(async (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) throw new ApiError(401, 'Debes iniciar sesión.');

  let carga: CargaToken;
  try {
    carga = jwt.verify(header.slice(7), env.jwtSecret) as CargaToken;
  } catch {
    throw new ApiError(401, 'Tu sesión expiró, inicia sesión de nuevo.');
  }

  const user = await User.findById(carga.sub);
  if (!user || user.version_sesion !== carga.ver) throw new ApiError(401, 'Tu sesión ya no es válida, inicia sesión de nuevo.');
  const bloqueo = motivoDeBloqueo(user);
  if (bloqueo) throw new ApiError(403, bloqueo);

  req.user = user;
  next();
});

export const soloAdmin: RequestHandler = (req, _res, next) => {
  if (req.user?.rol !== ROLES.ADMIN) throw new ApiError(403, 'Esta acción es solo para administradores.');
  next();
};
