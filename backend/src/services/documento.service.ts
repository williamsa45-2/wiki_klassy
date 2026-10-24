import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { env } from '../config/env';
import { TipoArchivo } from '../constants/enums';
import Documento, { DocumentoDocument } from '../models/documento.model';
import Seccion from '../models/seccion.model';
import { UserDocument } from '../models/user.model';
import ApiError from '../utils/ApiError';
import { detectarFormato } from '../utils/archivos';
import { normalizar } from '../utils/texto';
import { ContextoAcceso, contextoDeAcceso } from './acceso.service';

function vista(doc: DocumentoDocument, ctx: ContextoAcceso) {
  const seccionId = String(doc.seccion_id);
  const acceso = ctx.accesoA(seccionId, doc.tipo);
  return {
    id: String(doc._id),
    titulo: doc.titulo,
    descripcion: doc.descripcion,
    etiquetas: doc.etiquetas,
    tipo: doc.tipo,
    seccion_id: seccionId,
    ruta: ctx.rutaDe(seccionId),
    nombre_archivo: doc.archivo.nombre_original,
    tamano: doc.archivo.tamano,
    actualizado: doc.updatedAt,
    puede_descargar: acceso.descargar,
  };
}

/** «No existe» y «no autorizado» responden igual: quien no tiene permiso ni se entera de que el documento está. */
async function cargarConAcceso(user: UserDocument, id: string, requiere: 'ver' | 'descargar' = 'ver') {
  const [doc, ctx] = await Promise.all([Documento.findById(id), contextoDeAcceso(user)]);
  if (!doc) throw new ApiError(404, 'Documento no encontrado.');
  const acceso = ctx.accesoA(String(doc.seccion_id), doc.tipo);
  if (!acceso.ver) throw new ApiError(404, 'Documento no encontrado.');
  if (requiere === 'descargar' && !acceso.descargar) throw new ApiError(403, 'No tienes permiso para descargar este documento, solo para verlo.');
  return { doc, ctx };
}

interface Filtros {
  q?: string;
  seccion_id?: string;
  tipo?: string;
}

export async function listarDocumentos(user: UserDocument, filtros: Filtros) {
  const ctx = await contextoDeAcceso(user);
  const consulta: Record<string, unknown> = {};
  if (filtros.seccion_id) consulta.seccion_id = filtros.seccion_id;
  if (filtros.tipo) consulta.tipo = filtros.tipo;
  const docs = await Documento.find(consulta).sort({ titulo: 1 });

  const q = filtros.q ? normalizar(filtros.q) : '';
  return docs
    .filter((d) => ctx.accesoA(String(d.seccion_id), d.tipo).ver)
    .filter((d) => !q || normalizar([d.titulo, d.descripcion, d.etiquetas.join(' '), ctx.rutaDe(String(d.seccion_id))].join(' ')).includes(q))
    .map((d) => vista(d, ctx));
}

export async function obtenerDocumento(user: UserDocument, id: string) {
  const { doc, ctx } = await cargarConAcceso(user, id);
  return { doc, vista: vista(doc, ctx) };
}

async function guardarArchivo(archivo: Express.Multer.File) {
  const formato = detectarFormato(archivo.originalname, archivo.buffer);
  if (!formato) throw new ApiError(400, 'Formato no permitido, o el contenido no corresponde a su extensión.');
  const nombreGuardado = `${crypto.randomUUID()}.${formato.extension}`;
  await fs.mkdir(env.carpetaArchivos, { recursive: true });
  await fs.writeFile(path.join(env.carpetaArchivos, nombreGuardado), archivo.buffer, { flag: 'wx' });
  return {
    tipo: formato.tipo as TipoArchivo,
    archivo: {
      // Solo el nombre base: el cliente puede mandar rutas del tipo ..\..\x
      nombre_original: path.basename(archivo.originalname.replace(/\\/g, '/')).slice(0, 200),
      nombre_guardado: nombreGuardado,
      mime: formato.mime,
      tamano: archivo.size,
      sha256: crypto.createHash('sha256').update(archivo.buffer).digest('hex'),
    },
  };
}

const borrarDeDisco = (nombreGuardado: string) => fs.rm(path.join(env.carpetaArchivos, nombreGuardado), { force: true });

interface DatosDocumento {
  titulo: string;
  descripcion: string;
  seccion_id: string;
  etiquetas: string[];
}

export async function crearDocumento(user: UserDocument, datos: DatosDocumento, archivo: Express.Multer.File | undefined) {
  if (!archivo) throw new ApiError(400, 'Falta el archivo.');
  if (!(await Seccion.exists({ _id: datos.seccion_id }))) throw new ApiError(404, 'La sección no existe.');
  const guardado = await guardarArchivo(archivo);
  try {
    const doc = await Documento.create({ ...datos, ...guardado, subido_por: user._id });
    return String(doc._id);
  } catch (error) {
    await borrarDeDisco(guardado.archivo.nombre_guardado);
    throw error;
  }
}

export async function actualizarDocumento(id: string, datos: Partial<DatosDocumento>) {
  const doc = await Documento.findById(id);
  if (!doc) throw new ApiError(404, 'Documento no encontrado.');
  if (datos.seccion_id && !(await Seccion.exists({ _id: datos.seccion_id }))) throw new ApiError(404, 'La sección no existe.');
  doc.set(datos);
  await doc.save();
}

export async function reemplazarArchivo(id: string, archivo: Express.Multer.File | undefined) {
  if (!archivo) throw new ApiError(400, 'Falta el archivo.');
  const doc = await Documento.findById(id);
  if (!doc) throw new ApiError(404, 'Documento no encontrado.');
  const anterior = doc.archivo.nombre_guardado;
  const guardado = await guardarArchivo(archivo);
  doc.tipo = guardado.tipo;
  doc.archivo = guardado.archivo;
  await doc.save();
  await borrarDeDisco(anterior);
}

export async function eliminarDocumento(id: string) {
  const doc = await Documento.findByIdAndDelete(id);
  if (!doc) throw new ApiError(404, 'Documento no encontrado.');
  await borrarDeDisco(doc.archivo.nombre_guardado);
}

/** Devuelve la ruta en disco ya autorizada. Con `descargar` exige el permiso de descarga; sin él basta con el de ver. */
export async function archivoAutorizado(user: UserDocument, id: string, descargar: boolean) {
  const { doc } = await cargarConAcceso(user, id, descargar ? 'descargar' : 'ver');
  return { doc, ruta: path.join(env.carpetaArchivos, doc.archivo.nombre_guardado) };
}
