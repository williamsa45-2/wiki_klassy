import Documento from '../models/documento.model';
import Seccion from '../models/seccion.model';
import { UserDocument } from '../models/user.model';
import ApiError from '../utils/ApiError';
import { cadenaDeSeccion } from '../utils/permisos';
import { contextoDeAcceso } from './acceso.service';

/** Lista plana del árbol que el usuario puede recorrer; el frontend la arma con `padre_id`. El conteo solo incluye lo que ese usuario puede ver. */
export async function listarSecciones(user: UserDocument) {
  const [ctx, secciones, documentos] = await Promise.all([
    contextoDeAcceso(user),
    Seccion.find().sort({ orden: 1, nombre: 1 }).lean(),
    Documento.find().select('seccion_id tipo').lean(),
  ]);
  const navegables = ctx.navegables();

  const visibles = new Map<string, number>();
  for (const d of documentos) {
    const id = String(d.seccion_id);
    if (ctx.accesoA(id, d.tipo).ver) visibles.set(id, (visibles.get(id) ?? 0) + 1);
  }

  return secciones
    .filter((s) => navegables.has(String(s._id)))
    .map((s) => ({
      id: String(s._id),
      nombre: s.nombre,
      descripcion: s.descripcion,
      padre_id: s.padre_id ? String(s.padre_id) : null,
      orden: s.orden,
      ruta: ctx.rutaDe(String(s._id)),
      total_documentos: visibles.get(String(s._id)) ?? 0,
    }));
}

interface DatosSeccion {
  nombre: string;
  descripcion: string;
  padre_id: string | null;
  orden: number;
}

async function validarPadre(id: string | null, propia?: string) {
  if (!id) return;
  const padre = await Seccion.findById(id).select('padre_id');
  if (!padre) throw new ApiError(404, 'La sección padre no existe.');
  if (propia) {
    const padres = new Map((await Seccion.find().select('padre_id').lean()).map((s) => [String(s._id), s.padre_id ? String(s.padre_id) : null]));
    if (cadenaDeSeccion(id, padres).includes(propia)) throw new ApiError(409, 'Una sección no puede quedar dentro de sí misma.');
  }
}

export async function crearSeccion(datos: DatosSeccion) {
  await validarPadre(datos.padre_id);
  const seccion = await Seccion.create(datos);
  return { id: String(seccion._id) };
}

export async function actualizarSeccion(id: string, datos: Partial<DatosSeccion>) {
  const seccion = await Seccion.findById(id);
  if (!seccion) throw new ApiError(404, 'Sección no encontrada.');
  if (datos.padre_id !== undefined) await validarPadre(datos.padre_id, id);
  seccion.set(datos);
  await seccion.save();
}

/** Una sección con contenido no se borra: se vaciaría la wiki sin querer. */
export async function eliminarSeccion(id: string) {
  const [hijas, documentos] = await Promise.all([Seccion.countDocuments({ padre_id: id }), Documento.countDocuments({ seccion_id: id })]);
  if (hijas > 0 || documentos > 0) throw new ApiError(409, 'La sección tiene subsecciones o documentos. Muévelos o elimínalos primero.');
  const borrada = await Seccion.findByIdAndDelete(id);
  if (!borrada) throw new ApiError(404, 'Sección no encontrada.');
}
