import { Request, Response } from 'express';
import { ACCIONES_ACTIVIDAD } from '../constants/enums';
import { listarActividad, registrarActividad } from '../services/actividad.service';
import * as documentos from '../services/documento.service';

const texto = (valor: unknown) => (typeof valor === 'string' && valor ? valor : undefined);

export async function listar(req: Request, res: Response) {
  res.json(await documentos.listarDocumentos(req.user!, { q: texto(req.query.q), seccion_id: texto(req.query.seccion_id), tipo: texto(req.query.tipo) }));
}

export async function obtener(req: Request, res: Response) {
  const { vista } = await documentos.obtenerDocumento(req.user!, String(req.params.id));
  await registrarActividad(req, { accion: ACCIONES_ACTIVIDAD.VER, documentoId: vista.id, detalle: vista.titulo });
  res.json(vista);
}

export async function crear(req: Request, res: Response) {
  const { id, titulo, actualizado } = await documentos.crearDocumento(req.user!, req.body, req.file);
  await registrarActividad(req, {
    accion: actualizado ? ACCIONES_ACTIVIDAD.NUEVA_VERSION : ACCIONES_ACTIVIDAD.SUBIR,
    documentoId: id,
    detalle: `${titulo} (${req.file?.originalname})`,
  });
  res.status(actualizado ? 200 : 201).json({ id, actualizado });
}

export async function actualizar(req: Request, res: Response) {
  const { titulo, cambios } = await documentos.actualizarDocumento(String(req.params.id), req.body);
  if (cambios.length) await registrarActividad(req, { accion: ACCIONES_ACTIVIDAD.ACTUALIZAR, documentoId: String(req.params.id), detalle: `${titulo}: cambió ${cambios.join(', ')}` });
  res.status(204).end();
}

export async function reemplazarArchivo(req: Request, res: Response) {
  const { titulo } = await documentos.reemplazarArchivo(String(req.params.id), req.file);
  await registrarActividad(req, { accion: ACCIONES_ACTIVIDAD.NUEVA_VERSION, documentoId: String(req.params.id), detalle: `${titulo} (${req.file?.originalname})` });
  res.status(204).end();
}

export async function eliminar(req: Request, res: Response) {
  const { titulo } = await documentos.eliminarDocumento(String(req.params.id));
  await registrarActividad(req, { accion: ACCIONES_ACTIVIDAD.ELIMINAR, documentoId: String(req.params.id), detalle: titulo });
  res.status(204).end();
}

export async function historial(req: Request, res: Response) {
  res.json(await listarActividad(200, { documentoId: String(req.params.id), soloCambios: true }));
}

/** `?descargar=1` baja el archivo (exige permiso de descarga); sin él entrega los bytes para mostrarlos en la wiki (basta con ver). */
export async function archivo(req: Request, res: Response) {
  const descargar = req.query.descargar === '1';
  const { doc, ruta } = await documentos.archivoAutorizado(req.user!, String(req.params.id), descargar);
  if (descargar) await registrarActividad(req, { accion: ACCIONES_ACTIVIDAD.DESCARGAR, documentoId: doc.id, detalle: doc.titulo });

  res.setHeader('Content-Type', doc.archivo.mime);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('Content-Disposition', `${descargar ? 'attachment' : 'inline'}; filename*=UTF-8''${encodeURIComponent(doc.archivo.nombre_original)}`);
  res.sendFile(ruta, { dotfiles: 'allow' });
}
