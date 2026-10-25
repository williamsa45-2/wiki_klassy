import { ESTADOS_USUARIO, EstadoUsuario, ROLES, Rol, TipoArchivo } from '../constants/enums';
import Permiso from '../models/permiso.model';
import Seccion from '../models/seccion.model';
import User, { UserDocument } from '../models/user.model';
import ApiError from '../utils/ApiError';
import { estaVigente } from '../utils/permisos';
import { concesionDe } from './acceso.service';
import { hashearPassword, vistaUsuario } from './auth.service';

/** Fecha límite a partir de una duración (el reloj del servidor manda, no el del navegador) o de una fecha explícita. */
export function resolverLimite(datos: { hasta?: Date | null; duracion_minutos?: number | null }): Date | null {
  if (datos.duracion_minutos) return new Date(Date.now() + datos.duracion_minutos * 60_000);
  return datos.hasta ?? null;
}

async function buscarUsuario(id: string): Promise<UserDocument> {
  const user = await User.findById(id);
  if (!user) throw new ApiError(404, 'Usuario no encontrado.');
  return user;
}

async function exigirOtroAdminActivo(excluirId: string) {
  const otros = await User.countDocuments({ _id: { $ne: excluirId }, rol: ROLES.ADMIN, estado: ESTADOS_USUARIO.ACTIVO });
  if (otros === 0) throw new ApiError(409, 'Debe quedar al menos un administrador activo.');
}

export async function listarUsuarios(estado?: string) {
  const filtro: { estado?: EstadoUsuario } = estado && Object.values(ESTADOS_USUARIO).includes(estado as EstadoUsuario) ? { estado: estado as EstadoUsuario } : {};
  const usuarios = await User.find(filtro).sort({ createdAt: -1 });
  return usuarios.map(vistaUsuario);
}

export async function aprobarSolicitud(id: string, limite: Date | null, rol: Rol) {
  const user = await buscarUsuario(id);
  if (user.estado !== ESTADOS_USUARIO.PENDIENTE && user.estado !== ESTADOS_USUARIO.RECHAZADO) throw new ApiError(409, 'Esa cuenta no está pendiente.');
  user.estado = ESTADOS_USUARIO.ACTIVO;
  user.rol = rol;
  user.acceso_hasta = limite;
  await user.save();
  return vistaUsuario(user);
}

export async function rechazarSolicitud(id: string) {
  const user = await buscarUsuario(id);
  if (user.estado !== ESTADOS_USUARIO.PENDIENTE) throw new ApiError(409, 'Solo se puede rechazar una solicitud pendiente.');
  user.estado = ESTADOS_USUARIO.RECHAZADO;
  await user.save();
  return vistaUsuario(user);
}

/** Suspender no borra al usuario ni sus permisos: reactivarlo lo deja exactamente como estaba. */
export async function cambiarEstado(id: string, quien: UserDocument, estado: 'ACTIVO' | 'INACTIVO') {
  const user = await buscarUsuario(id);
  if (user.estado === ESTADOS_USUARIO.PENDIENTE || user.estado === ESTADOS_USUARIO.RECHAZADO) throw new ApiError(409, 'Primero hay que aprobar la solicitud.');
  if (estado === 'INACTIVO') {
    if (String(user._id) === String(quien._id)) throw new ApiError(409, 'No puedes suspender tu propia cuenta.');
    if (user.rol === ROLES.ADMIN) await exigirOtroAdminActivo(id);
  }
  user.estado = estado;
  user.version_sesion += 1;
  await user.save();
  return vistaUsuario(user);
}

export async function cambiarRol(id: string, quien: UserDocument, rol: Rol) {
  const user = await buscarUsuario(id);
  if (user.rol === rol) return vistaUsuario(user);
  if (String(user._id) === String(quien._id)) throw new ApiError(409, 'No puedes cambiar tu propio rol.');
  if (user.estado !== ESTADOS_USUARIO.ACTIVO) throw new ApiError(409, 'Solo se cambia el rol de una cuenta activa.');
  user.rol = rol;
  user.version_sesion += 1;
  await user.save();
  return vistaUsuario(user);
}

/** null quita el límite. Pasada la fecha la cuenta no entra, pero sigue existiendo con todos sus permisos. */
export async function fijarAccesoHasta(id: string, limite: Date | null) {
  const user = await buscarUsuario(id);
  user.acceso_hasta = limite;
  await user.save();
  return vistaUsuario(user);
}

export async function restablecerPassword(id: string, password: string) {
  const user = await buscarUsuario(id);
  user.password_hash = await hashearPassword(password);
  user.version_sesion += 1;
  await user.save();
}

interface DatosPermiso {
  seccion_id: string | null;
  ver: boolean;
  descargar: boolean;
  tipos: TipoArchivo[];
  desde: Date | null;
  hasta: Date | null;
  nota: string;
}

function vistaPermiso(p: {
  _id: unknown;
  seccion_id: unknown;
  ver: boolean;
  descargar: boolean;
  tipos: string[];
  desde: Date | null;
  hasta: Date | null;
  revocado_en: Date | null;
  nota: string;
  createdAt?: Date;
}) {
  const vigente = estaVigente(concesionDe(p), new Date());
  return {
    id: String(p._id),
    seccion_id: p.seccion_id ? String(p.seccion_id) : null,
    ver: p.ver,
    descargar: p.descargar,
    tipos: p.tipos,
    desde: p.desde,
    hasta: p.hasta,
    revocado_en: p.revocado_en,
    nota: p.nota,
    estado: p.revocado_en ? 'REVOCADO' : p.hasta && new Date() >= p.hasta ? 'VENCIDO' : p.desde && new Date() < p.desde ? 'PROGRAMADO' : 'VIGENTE',
    vigente,
  };
}

export async function listarPermisos(usuarioId: string) {
  await buscarUsuario(usuarioId);
  const permisos = await Permiso.find({ usuario_id: usuarioId }).sort({ createdAt: -1 }).lean();
  return permisos.map(vistaPermiso);
}

async function validarPermiso(datos: DatosPermiso) {
  if (datos.seccion_id && !(await Seccion.exists({ _id: datos.seccion_id }))) throw new ApiError(404, 'La sección no existe.');
  if (!datos.ver && !datos.descargar) throw new ApiError(400, 'El permiso debe permitir al menos ver.');
  if (datos.hasta && datos.hasta <= (datos.desde ?? new Date())) throw new ApiError(400, 'La fecha de vencimiento debe ser posterior al inicio.');
}

export async function otorgarPermiso(usuarioId: string, admin: UserDocument, datos: DatosPermiso) {
  const destino = await buscarUsuario(usuarioId);
  if (destino.rol === ROLES.ADMIN) throw new ApiError(409, 'Un administrador ya tiene acceso a todo.');
  const normalizado = { ...datos, ver: true };
  await validarPermiso(normalizado);
  const permiso = await Permiso.create({ ...normalizado, usuario_id: usuarioId, otorgado_por: admin._id });
  return vistaPermiso(permiso.toObject());
}

export async function actualizarPermiso(permisoId: string, datos: Partial<DatosPermiso>) {
  const permiso = await Permiso.findById(permisoId);
  if (!permiso) throw new ApiError(404, 'Permiso no encontrado.');
  if (permiso.revocado_en) throw new ApiError(409, 'Un permiso revocado no se edita: concede uno nuevo.');
  const combinado: DatosPermiso = {
    seccion_id: datos.seccion_id !== undefined ? datos.seccion_id : permiso.seccion_id ? String(permiso.seccion_id) : null,
    ver: true,
    descargar: datos.descargar ?? permiso.descargar,
    tipos: datos.tipos ?? (permiso.tipos as TipoArchivo[]),
    desde: datos.desde !== undefined ? datos.desde : permiso.desde,
    hasta: datos.hasta !== undefined ? datos.hasta : permiso.hasta,
    nota: datos.nota ?? permiso.nota,
  };
  await validarPermiso(combinado);
  permiso.set({ ...combinado, seccion_id: combinado.seccion_id });
  await permiso.save();
  return vistaPermiso(permiso.toObject());
}

export async function revocarPermiso(permisoId: string) {
  const permiso = await Permiso.findById(permisoId);
  if (!permiso) throw new ApiError(404, 'Permiso no encontrado.');
  if (!permiso.revocado_en) {
    permiso.revocado_en = new Date();
    await permiso.save();
  }
  return vistaPermiso(permiso.toObject());
}
