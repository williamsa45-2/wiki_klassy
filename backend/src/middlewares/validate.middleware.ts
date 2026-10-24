import { RequestHandler } from 'express';
import { ObjectSchema } from 'joi';
import ApiError from '../utils/ApiError';

/** Valida el cuerpo y lo reemplaza por la versión limpia (sin campos desconocidos). */
export const validar =
  (esquema: ObjectSchema): RequestHandler =>
  (req, _res, next) => {
    const { error, value } = esquema.validate(req.body ?? {}, { abortEarly: false, stripUnknown: true });
    if (error) throw new ApiError(400, error.details.map((d) => d.message).join(' '));
    req.body = value;
    next();
  };
