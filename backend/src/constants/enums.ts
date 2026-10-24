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
  ELIMINAR: 'ELIMINAR',
  PERMISO_CONCEDIDO: 'PERMISO_CONCEDIDO',
  PERMISO_REVOCADO: 'PERMISO_REVOCADO',
  USUARIO_GESTIONADO: 'USUARIO_GESTIONADO',
} as const;
export type AccionActividad = (typeof ACCIONES_ACTIVIDAD)[keyof typeof ACCIONES_ACTIVIDAD];
