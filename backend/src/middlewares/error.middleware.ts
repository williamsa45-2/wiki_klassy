import { ErrorRequestHandler, RequestHandler } from 'express';
import { MulterError } from 'multer';
import { env } from '../config/env';
import ApiError from '../utils/ApiError';

export const notFound: RequestHandler = (_req, _res, next) => next(new ApiError(404, 'Ruta no encontrada.'));

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({ message: err.message, details: err.details });
    return;
  }
  if (err instanceof MulterError) {
    const message = err.code === 'LIMIT_FILE_SIZE' ? `El archivo supera el máximo de ${env.maxArchivoMb} MB.` : 'No se pudo leer el archivo.';
    res.status(400).json({ message });
    return;
  }
  if (err?.code === 11000) {
    res.status(409).json({ message: 'Ya existe un registro con esos datos.' });
    return;
  }
  if (err?.name === 'CastError') {
    res.status(404).json({ message: 'No se encontró el registro.' });
    return;
  }
  console.error(err);
  res.status(500).json({ message: 'Error interno del servidor.' });
};
