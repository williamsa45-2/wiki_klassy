import { TipoArchivo, ROLES } from '../constants/enums';
import Permiso from '../models/permiso.model';
import Seccion from '../models/seccion.model';
import { UserDocument } from '../models/user.model';
import { Acceso, Concesion, PadresDeSeccion, accesoAlDocumento, cadenaDeSeccion, seccionesNavegables } from '../utils/permisos';

export interface ContextoAcceso {
  esAdmin: boolean;
  padres: PadresDeSeccion;
  nombres: Map<string, string>;
  accesoA(seccionId: string, tipo: TipoArchivo): Acceso;
  /** Secciones que el usuario puede recorrer en el árbol. */
  navegables(): Set<string>;
  /** «Historias de usuario / Backend»: para mostrar dónde está un documento y para que el asistente lo entienda. */
  rutaDe(seccionId: string): string;
}

export function concesionDe(p: {
  seccion_id: unknown;
  ver: boolean;
  descargar: boolean;
  tipos: string[];
  desde: Date | null;
  hasta: Date | null;
  revocado_en: Date | null;
}): Concesion {
  return {
    seccion_id: p.seccion_id ? String(p.seccion_id) : null,
    ver: p.ver,
    descargar: p.descargar,
    tipos: p.tipos as TipoArchivo[],
    desde: p.desde,
    hasta: p.hasta,
    revocado: p.revocado_en !== null,
  };
}

/** Carga una sola vez lo necesario para decidir qué ve este usuario en toda la petición. */
export async function contextoDeAcceso(user: UserDocument): Promise<ContextoAcceso> {
  const secciones = await Seccion.find().select('nombre padre_id').lean();
  const padres: PadresDeSeccion = new Map(secciones.map((s) => [String(s._id), s.padre_id ? String(s.padre_id) : null]));
  const nombres = new Map(secciones.map((s) => [String(s._id), s.nombre]));
  const esAdmin = user.rol === ROLES.ADMIN;
  const concesiones = esAdmin ? [] : (await Permiso.find({ usuario_id: user._id, revocado_en: null }).lean()).map(concesionDe);
  const ahora = new Date();

  return {
    esAdmin,
    padres,
    nombres,
    accesoA: (seccionId, tipo) => (esAdmin ? { ver: true, descargar: true } : accesoAlDocumento(concesiones, padres, seccionId, tipo, ahora)),
    navegables: () => (esAdmin ? new Set(padres.keys()) : seccionesNavegables(concesiones, padres, ahora)),
    rutaDe: (seccionId) =>
      cadenaDeSeccion(seccionId, padres)
        .reverse()
        .map((id) => nombres.get(id) ?? '')
        .join(' / '),
  };
}
