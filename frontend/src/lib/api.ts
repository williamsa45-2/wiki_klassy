const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4100/api/v1';
const CLAVE_TOKEN = 'wiki.token';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function leerToken(): string | null {
  try {
    return localStorage.getItem(CLAVE_TOKEN);
  } catch {
    return null;
  }
}

export function guardarToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(CLAVE_TOKEN, token);
    else localStorage.removeItem(CLAVE_TOKEN);
  } catch {
    // Sin almacenamiento (navegación privada) la sesión dura hasta recargar.
  }
}

/** Lo registra AuthContext: una sesión vencida o suspendida en cualquier petición devuelve al login. */
let alSesionInvalida: () => void = () => {};
export const alPerderSesion = (fn: () => void) => {
  alSesionInvalida = fn;
};

async function pedir(metodo: string, ruta: string, cuerpo?: unknown): Promise<Response> {
  const headers: Record<string, string> = {};
  const token = leerToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  let body: BodyInit | undefined;
  if (cuerpo instanceof FormData) body = cuerpo;
  else if (cuerpo !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(cuerpo);
  }

  let respuesta: Response;
  try {
    respuesta = await fetch(`${BASE}${ruta}`, { method: metodo, headers, body });
  } catch {
    throw new ApiError(0, 'No se pudo conectar con el servidor.');
  }
  if (!respuesta.ok) {
    const datos = await respuesta.json().catch(() => null);
    const mensaje = (datos as { message?: string } | null)?.message ?? 'Ocurrió un error inesperado.';
    // En el login un 401 es «clave incorrecta», no «sesión vencida».
    if ((respuesta.status === 401 || respuesta.status === 403) && leerToken() && !ruta.startsWith('/auth/login')) {
      if (respuesta.status === 401 || /venci|suspend/i.test(mensaje)) alSesionInvalida();
    }
    throw new ApiError(respuesta.status, mensaje);
  }
  return respuesta;
}

async function json<T>(metodo: string, ruta: string, cuerpo?: unknown): Promise<T> {
  const r = await pedir(metodo, ruta, cuerpo);
  return r.status === 204 ? (undefined as T) : ((await r.json()) as T);
}

export const api = {
  get: <T>(ruta: string) => json<T>('GET', ruta),
  post: <T>(ruta: string, cuerpo?: unknown) => json<T>('POST', ruta, cuerpo ?? {}),
  patch: <T>(ruta: string, cuerpo: unknown) => json<T>('PATCH', ruta, cuerpo),
  put: <T>(ruta: string, cuerpo: unknown) => json<T>('PUT', ruta, cuerpo),
  delete: <T>(ruta: string) => json<T>('DELETE', ruta),
  /** Archivos: siempre con sesión (el navegador no puede abrir la URL directa porque lleva el token en un header). */
  blob: async (ruta: string) => (await pedir('GET', ruta)).blob(),
};

export function mensajeDeError(error: unknown): string {
  return error instanceof Error ? error.message : 'Ocurrió un error inesperado.';
}
