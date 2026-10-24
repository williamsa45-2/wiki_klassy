import bcrypt from 'bcryptjs';
import { ESTADOS_USUARIO, ROLES } from '../constants/enums';
import { firmarToken, motivoDeBloqueo } from '../middlewares/auth.middleware';
import User, { UserDocument } from '../models/user.model';
import ApiError from '../utils/ApiError';

const RONDAS_BCRYPT = 12;
// Hash de relleno: así un correo inexistente tarda lo mismo que uno real y no se puede enumerar cuentas midiendo el tiempo.
const HASH_RELLENO = bcrypt.hashSync('relleno-para-igualar-tiempos', RONDAS_BCRYPT);

export const hashearPassword = (password: string) => bcrypt.hash(password, RONDAS_BCRYPT);

export function vistaUsuario(user: UserDocument) {
  return {
    id: String(user._id),
    nombre: user.nombre,
    email: user.email,
    rol: user.rol,
    estado: user.estado,
    motivo_solicitud: user.motivo_solicitud,
    acceso_hasta: user.acceso_hasta,
    ultimo_acceso: user.ultimo_acceso,
    creado: user.createdAt,
  };
}

/** Solo deja una solicitud: la cuenta no puede entrar hasta que un administrador la apruebe. */
export async function solicitarRegistro(datos: { nombre: string; email: string; password: string; motivo: string }) {
  const existente = await User.findOne({ email: datos.email.toLowerCase() });
  if (existente) throw new ApiError(409, 'Ya existe una solicitud o cuenta con ese correo.');
  await User.create({
    nombre: datos.nombre,
    email: datos.email,
    password_hash: await hashearPassword(datos.password),
    motivo_solicitud: datos.motivo,
    rol: ROLES.USUARIO,
    estado: ESTADOS_USUARIO.PENDIENTE,
  });
}

export async function iniciarSesion(email: string, password: string) {
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password_hash');
  const correcta = await bcrypt.compare(password, user?.password_hash ?? HASH_RELLENO);
  if (!user || !correcta) throw new ApiError(401, 'Correo o contraseña incorrectos.');

  // Ya demostró quién es, así que aquí sí se le dice por qué no entra.
  const bloqueo = motivoDeBloqueo(user);
  if (bloqueo) throw new ApiError(403, bloqueo);

  user.ultimo_acceso = new Date();
  await user.save();
  return { token: firmarToken(String(user._id), user.version_sesion), usuario: vistaUsuario(user) };
}

export async function cambiarPassword(user: UserDocument, actual: string, nueva: string) {
  const conHash = await User.findById(user._id).select('+password_hash');
  if (!conHash || !(await bcrypt.compare(actual, conHash.password_hash))) throw new ApiError(400, 'La contraseña actual no es correcta.');
  conHash.password_hash = await hashearPassword(nueva);
  conHash.version_sesion += 1;
  await conHash.save();
  return { token: firmarToken(String(conHash._id), conHash.version_sesion) };
}
