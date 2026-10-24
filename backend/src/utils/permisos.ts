import { TipoArchivo } from '../constants/enums';

/** Un permiso ya reducido a lo que decide el acceso (sin Mongoose, para poder probarlo con datos planos). */
export interface Concesion {
  /** null = toda la wiki. */
  seccion_id: string | null;
  ver: boolean;
  descargar: boolean;
  /** Vacío = cualquier tipo de archivo. */
  tipos: TipoArchivo[];
  desde: Date | null;
  hasta: Date | null;
  revocado: boolean;
}

export type PadresDeSeccion = Map<string, string | null>;

export interface Acceso {
  ver: boolean;
  descargar: boolean;
}

export const SIN_ACCESO: Acceso = { ver: false, descargar: false };

/** La sección y todos sus ancestros, de la propia hacia la raíz. Tolera ciclos por si hubiera datos corruptos. */
export function cadenaDeSeccion(seccionId: string, padres: PadresDeSeccion): string[] {
  const cadena: string[] = [];
  let actual: string | null | undefined = seccionId;
  while (actual && !cadena.includes(actual)) {
    cadena.push(actual);
    actual = padres.get(actual);
  }
  return cadena;
}

export function estaVigente(c: Concesion, ahora: Date): boolean {
  if (c.revocado) return false;
  if (c.desde && ahora < c.desde) return false;
  if (c.hasta && ahora >= c.hasta) return false;
  return true;
}

function cubreSeccion(c: Concesion, cadena: string[]): boolean {
  return c.seccion_id === null || cadena.includes(c.seccion_id);
}

/**
 * Acceso de un usuario no admin a un documento. «Descargar» exige además poder ver: bajar un archivo que no se puede
 * abrir no tiene sentido y evita que un permiso mal armado exponga contenido.
 */
export function accesoAlDocumento(
  concesiones: Concesion[],
  padres: PadresDeSeccion,
  seccionId: string,
  tipo: TipoArchivo,
  ahora: Date
): Acceso {
  const cadena = cadenaDeSeccion(seccionId, padres);
  const aplicables = concesiones.filter(
    (c) => estaVigente(c, ahora) && cubreSeccion(c, cadena) && (c.tipos.length === 0 || c.tipos.includes(tipo))
  );
  const ver = aplicables.some((c) => c.ver);
  return { ver, descargar: ver && aplicables.some((c) => c.descargar) };
}

/**
 * Secciones que el usuario puede recorrer: las que cubre algún permiso de ver y los ancestros de cada sección con
 * permiso (para poder llegar hasta ella). Los ancestros solo se recorren; su contenido propio sigue dependiendo de `accesoAlDocumento`.
 */
export function seccionesNavegables(concesiones: Concesion[], padres: PadresDeSeccion, ahora: Date): Set<string> {
  const vigentes = concesiones.filter((c) => estaVigente(c, ahora) && c.ver);
  const visibles = new Set<string>();
  if (vigentes.some((c) => c.seccion_id === null)) {
    padres.forEach((_p, id) => visibles.add(id));
    return visibles;
  }
  for (const id of padres.keys()) {
    const cadena = cadenaDeSeccion(id, padres);
    if (vigentes.some((c) => c.seccion_id !== null && cadena.includes(c.seccion_id))) visibles.add(id);
  }
  for (const c of vigentes) {
    if (c.seccion_id === null) continue;
    for (const ancestro of cadenaDeSeccion(c.seccion_id, padres)) visibles.add(ancestro);
  }
  return visibles;
}
