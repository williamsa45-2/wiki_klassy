import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const nodeEnv = process.env.NODE_ENV || 'development';
const enProduccion = nodeEnv === 'production';

const jwtSecret = process.env.JWT_SECRET || '';
if (enProduccion && jwtSecret.length < 32) {
  throw new Error('JWT_SECRET debe tener al menos 32 caracteres en producción.');
}

const carpetaArchivos = path.resolve(process.env.CARPETA_ARCHIVOS || path.join(__dirname, '..', '..', 'uploads'));

export const env = {
  nodeEnv,
  port: Number(process.env.PORT) || 4100,
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/wiki_klassy',
  // En desarrollo sin secreto se genera uno por arranque: las sesiones no sobreviven a reiniciar, pero nunca queda uno fijo conocido.
  jwtSecret: jwtSecret || crypto.randomBytes(32).toString('hex'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5174',
  /** Cuántos proxies hay delante del API (nginx = 1; Caddy + nginx = 2). De esto depende que el límite de intentos use la IP real y no la del proxy. */
  proxiesConfiables: Number(process.env.TRUST_PROXY ?? 1),
  /** Carpeta privada de archivos: nunca se sirve como estática, solo a través de un endpoint con sesión y permiso. */
  carpetaArchivos,
  maxArchivoMb: Number(process.env.MAX_ARCHIVO_MB) || 50,
  /** Historial de actividad en archivo plano (una línea JSON por evento, solo se agrega). Por defecto junto a los archivos: mismo volumen y mismo respaldo. */
  archivoHistorial: path.resolve(process.env.ARCHIVO_HISTORIAL || path.join(carpetaArchivos, 'historial.jsonl')),
  /** Opcional: sin clave, el asistente usa la búsqueda local por palabras. */
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  asistenteModelo: process.env.ASISTENTE_MODELO || 'claude-haiku-5-5',
};
