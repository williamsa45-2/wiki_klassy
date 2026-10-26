import { Request, Response } from 'express';
import { ACCIONES_ACTIVIDAD, AccionActividad } from '../constants/enums';
import { registrarActividad } from '../services/actividad.service';
import * as usuarios from '../services/usuario.service';

const id = (req: Request) => String(req.params.id);
const limiteDe = (req: Request) => usuarios.resolverLimite({ hasta: req.body.hasta, duracion_minutos: req.body.duracion_minutos });

async function auditar(req: Request, detalle: string, accion: AccionActividad = ACCIONES_ACTIVIDAD.USUARIO_GESTIONADO) {
  await registrarActividad(req, { accion, detalle });
}

export async function listar(req: Request, res: Response) {
  res.json(await usuarios.listarUsuarios(typeof req.query.estado === 'string' ? req.query.estado : undefined));
}

export async function aprobar(req: Request, res: Response) {
  const usuario = await usuarios.aprobarSolicitud(id(req), limiteDe(req), req.body.rol);
  await auditar(req, `Aprobó a ${usuario.email} como ${usuario.rol}`);
  res.json(usuario);
}

export async function rechazar(req: Request, res: Response) {
  const usuario = await usuarios.rechazarSolicitud(id(req));
  await auditar(req, `Rechazó a ${usuario.email}`);
  res.json(usuario);
}

export async function cambiarEstado(req: Request, res: Response) {
  const usuario = await usuarios.cambiarEstado(id(req), req.user!, req.body.estado);
  await auditar(req, `${req.body.estado === 'ACTIVO' ? 'Reactivó' : 'Suspendió'} a ${usuario.email}`);
  res.json(usuario);
}

export async function cambiarRol(req: Request, res: Response) {
  const usuario = await usuarios.cambiarRol(id(req), req.user!, req.body.rol);
  await auditar(req, `Cambió el rol de ${usuario.email} a ${usuario.rol}`);
  res.json(usuario);
}

export async function fijarAccesoHasta(req: Request, res: Response) {
  const usuario = await usuarios.fijarAccesoHasta(id(req), limiteDe(req));
  await auditar(req, `Acceso de ${usuario.email} ${usuario.acceso_hasta ? 'hasta ' + usuario.acceso_hasta.toISOString() : 'sin vencimiento'}`);
  res.json(usuario);
}

export async function restablecerPassword(req: Request, res: Response) {
  const usuario = await usuarios.restablecerPassword(id(req), req.body.password);
  await auditar(req, `Restableció la contraseña de ${usuario.email}`);
  res.status(204).end();
}

export async function listarPermisos(req: Request, res: Response) {
  res.json(await usuarios.listarPermisos(id(req)));
}

export async function otorgarPermiso(req: Request, res: Response) {
  const { duracion_minutos: _duracion, hasta: _hasta, ...resto } = req.body;
  const permiso = await usuarios.otorgarPermiso(id(req), req.user!, { ...resto, hasta: limiteDe(req) });
  await auditar(req, `Concedió permiso a ${await usuarios.correoDeUsuario(id(req))}`, ACCIONES_ACTIVIDAD.PERMISO_CONCEDIDO);
  res.status(201).json(permiso);
}

export async function actualizarPermiso(req: Request, res: Response) {
  const { duracion_minutos, hasta, ...resto } = req.body;
  const cambios = duracion_minutos !== undefined || hasta !== undefined ? { ...resto, hasta: limiteDe(req) } : resto;
  const permiso = await usuarios.actualizarPermiso(String(req.params.permisoId), cambios);
  await auditar(req, `Editó un permiso de ${await usuarios.correoDeUsuario(permiso.usuario_id)}`, ACCIONES_ACTIVIDAD.PERMISO_ACTUALIZADO);
  res.json(permiso);
}

export async function revocarPermiso(req: Request, res: Response) {
  const permiso = await usuarios.revocarPermiso(String(req.params.permisoId));
  await auditar(req, `Revocó un permiso de ${await usuarios.correoDeUsuario(permiso.usuario_id)}`, ACCIONES_ACTIVIDAD.PERMISO_REVOCADO);
  res.json(permiso);
}
