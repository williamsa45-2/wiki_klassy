export const ROLES = { ADMIN: 'ADMIN', USUARIO: 'USUARIO' } as const;
export type Rol = (typeof ROLES)[keyof typeof ROLES];

/** PENDIENTE: pidió registro y el admin aún no decide (no puede entrar). INACTIVO: suspendida, se puede reactivar sin perder sus permisos. */
export const ESTADOS_USUARIO = {
  PENDIENTE: 'PENDIENTE',
  ACTIVO: 'ACTIVO',
  INACTIVO: 'INACTIVO',
  RECHAZADO: 'RECHAZADO',
} as const;
export type EstadoUsuario = (typeof ESTADOS_USUARIO)[keyof typeof ESTADOS_USUARIO];

/** Tipos que la wiki sabe mostrar de forma especial; el resto cae en OTRO (se baja, o se ve si es texto o imagen). */
export const TIPOS_ARCHIVO = { PDF: 'PDF', DOCX: 'DOCX', DRAWIO: 'DRAWIO', TEXTO: 'TEXTO', IMAGEN: 'IMAGEN', OTRO: 'OTRO' } as const;
export type TipoArchivo = (typeof TIPOS_ARCHIVO)[keyof typeof TIPOS_ARCHIVO];

export const ACCIONES_ACTIVIDAD = {
  LOGIN: 'LOGIN',
  VER: 'VER',
  DESCARGAR: 'DESCARGAR',
  SUBIR: 'SUBIR',
  NUEVA_VERSION: 'NUEVA_VERSION',
  ACTUALIZAR: 'ACTUALIZAR',
  ELIMINAR: 'ELIMINAR',
  SECCION_CREADA: 'SECCION_CREADA',
  SECCION_ACTUALIZADA: 'SECCION_ACTUALIZADA',
  SECCION_ELIMINADA: 'SECCION_ELIMINADA',
  PERMISO_CONCEDIDO: 'PERMISO_CONCEDIDO',
  PERMISO_ACTUALIZADO: 'PERMISO_ACTUALIZADO',
  PERMISO_REVOCADO: 'PERMISO_REVOCADO',
  USUARIO_GESTIONADO: 'USUARIO_GESTIONADO',
  REGISTRO_SOLICITADO: 'REGISTRO_SOLICITADO',
  PASSWORD_CAMBIADA: 'PASSWORD_CAMBIADA',
} as const;
export type AccionActividad = (typeof ACCIONES_ACTIVIDAD)[keyof typeof ACCIONES_ACTIVIDAD];

/** El historial de cambios: todo lo que guarda algo. Entrar, ver y descargar son consultas, no cambios. */
export const ACCIONES_DE_CAMBIO: AccionActividad[] = Object.values(ACCIONES_ACTIVIDAD).filter(
  (a) => a !== ACCIONES_ACTIVIDAD.LOGIN && a !== ACCIONES_ACTIVIDAD.VER && a !== ACCIONES_ACTIVIDAD.DESCARGAR
);
