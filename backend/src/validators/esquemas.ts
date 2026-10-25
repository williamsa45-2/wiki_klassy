import Joi from 'joi';
import { ROLES, TIPOS_ARCHIVO } from '../constants/enums';

const objectId = Joi.string().hex().length(24);
const limiteDuracion = 60 * 24 * 365; // un año, en minutos

const mensajesPassword = { 'string.min': 'La contraseña debe tener al menos 10 caracteres.', 'string.max': 'La contraseña no puede pasar de 72 caracteres.' };
const password = Joi.string().min(10).max(72).required().messages(mensajesPassword);

export const registro = Joi.object({
  nombre: Joi.string().trim().min(2).max(120).required(),
  email: Joi.string().trim().email().max(160).required(),
  password,
  motivo: Joi.string().trim().allow('').max(500).default(''),
});

export const login = Joi.object({
  email: Joi.string().trim().email().required(),
  password: Joi.string().max(72).required(),
});

export const cambioPassword = Joi.object({ actual: Joi.string().max(72).required(), nueva: password });

export const nuevaPassword = Joi.object({ password });

/** «Por cuánto tiempo»: una duración o una fecha. Sin ninguna de las dos no hay límite. */
const limite = {
  duracion_minutos: Joi.number().integer().min(1).max(limiteDuracion).allow(null),
  hasta: Joi.date().iso().allow(null),
};

export const aprobacion = Joi.object({ ...limite, rol: Joi.string().valid(...Object.values(ROLES)).default(ROLES.USUARIO) }).oxor('duracion_minutos', 'hasta');
export const accesoHasta = Joi.object(limite).oxor('duracion_minutos', 'hasta');

export const estadoUsuario = Joi.object({ estado: Joi.string().valid('ACTIVO', 'INACTIVO').required() });
export const rolUsuario = Joi.object({ rol: Joi.string().valid(...Object.values(ROLES)).required() });

const tipos = Joi.array().items(Joi.string().valid(...Object.values(TIPOS_ARCHIVO))).unique();

export const permisoNuevo = Joi.object({
  seccion_id: objectId.allow(null).default(null),
  descargar: Joi.boolean().default(false),
  tipos: tipos.default([]),
  desde: Joi.date().iso().allow(null).default(null),
  nota: Joi.string().trim().allow('').max(300).default(''),
  ...limite,
}).oxor('duracion_minutos', 'hasta');

export const permisoEdicion = Joi.object({
  seccion_id: objectId.allow(null),
  descargar: Joi.boolean(),
  tipos,
  desde: Joi.date().iso().allow(null),
  nota: Joi.string().trim().allow('').max(300),
  ...limite,
}).oxor('duracion_minutos', 'hasta');

export const seccionNueva = Joi.object({
  nombre: Joi.string().trim().min(1).max(120).required(),
  descripcion: Joi.string().trim().allow('').max(500).default(''),
  padre_id: objectId.allow(null).default(null),
  orden: Joi.number().integer().default(0),
});

export const seccionEdicion = Joi.object({
  nombre: Joi.string().trim().min(1).max(120),
  descripcion: Joi.string().trim().allow('').max(500),
  padre_id: objectId.allow(null),
  orden: Joi.number().integer(),
});

/** Las etiquetas llegan como texto («a, b, c») porque el formulario con archivo es multipart. */
const etiquetas = Joi.string()
  .allow('')
  .custom((valor: string) =>
    valor
      .split(',')
      .map((e) => e.trim())
      .filter(Boolean)
      .slice(0, 20)
  );

export const documentoNuevo = Joi.object({
  titulo: Joi.string().trim().min(1).max(200).required(),
  descripcion: Joi.string().trim().allow('').max(1000).default(''),
  seccion_id: objectId.required(),
  etiquetas: etiquetas.default([]),
});

export const documentoEdicion = Joi.object({
  titulo: Joi.string().trim().min(1).max(200),
  descripcion: Joi.string().trim().allow('').max(1000),
  seccion_id: objectId,
  etiquetas: Joi.alternatives(Joi.array().items(Joi.string().trim().max(40)).max(20), etiquetas),
});

export const pregunta = Joi.object({
  pregunta: Joi.string().trim().min(2).max(500).required(),
  ubicacion: Joi.string().trim().allow('').max(300).default(''),
});
