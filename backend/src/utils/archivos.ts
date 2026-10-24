import { TIPOS_ARCHIVO, TipoArchivo } from '../constants/enums';

interface Formato {
  tipo: TipoArchivo;
  mime: string;
  /** Cómo se comprueba que el contenido es de verdad lo que dice la extensión. */
  firma: 'pdf' | 'zip' | 'ole' | 'png' | 'jpg' | 'gif' | 'webp' | 'drawio' | 'texto';
}

/**
 * Lista cerrada: solo se aceptan estos formatos. No hay HTML, SVG ni scripts porque se sirven desde el mismo origen
 * del API y ejecutarían código en el navegador de quien los abra.
 */
const FORMATOS: Record<string, Formato> = {
  pdf: { tipo: TIPOS_ARCHIVO.PDF, mime: 'application/pdf', firma: 'pdf' },
  docx: { tipo: TIPOS_ARCHIVO.DOCX, mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', firma: 'zip' },
  doc: { tipo: TIPOS_ARCHIVO.OTRO, mime: 'application/msword', firma: 'ole' },
  xlsx: { tipo: TIPOS_ARCHIVO.OTRO, mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', firma: 'zip' },
  xls: { tipo: TIPOS_ARCHIVO.OTRO, mime: 'application/vnd.ms-excel', firma: 'ole' },
  pptx: { tipo: TIPOS_ARCHIVO.OTRO, mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', firma: 'zip' },
  ppt: { tipo: TIPOS_ARCHIVO.OTRO, mime: 'application/vnd.ms-powerpoint', firma: 'ole' },
  drawio: { tipo: TIPOS_ARCHIVO.DRAWIO, mime: 'application/vnd.jgraph.mxfile', firma: 'drawio' },
  dio: { tipo: TIPOS_ARCHIVO.DRAWIO, mime: 'application/vnd.jgraph.mxfile', firma: 'drawio' },
  txt: { tipo: TIPOS_ARCHIVO.TEXTO, mime: 'text/plain; charset=utf-8', firma: 'texto' },
  md: { tipo: TIPOS_ARCHIVO.TEXTO, mime: 'text/plain; charset=utf-8', firma: 'texto' },
  csv: { tipo: TIPOS_ARCHIVO.TEXTO, mime: 'text/plain; charset=utf-8', firma: 'texto' },
  json: { tipo: TIPOS_ARCHIVO.TEXTO, mime: 'text/plain; charset=utf-8', firma: 'texto' },
  png: { tipo: TIPOS_ARCHIVO.IMAGEN, mime: 'image/png', firma: 'png' },
  jpg: { tipo: TIPOS_ARCHIVO.IMAGEN, mime: 'image/jpeg', firma: 'jpg' },
  jpeg: { tipo: TIPOS_ARCHIVO.IMAGEN, mime: 'image/jpeg', firma: 'jpg' },
  gif: { tipo: TIPOS_ARCHIVO.IMAGEN, mime: 'image/gif', firma: 'gif' },
  webp: { tipo: TIPOS_ARCHIVO.IMAGEN, mime: 'image/webp', firma: 'webp' },
};

export const EXTENSIONES_PERMITIDAS = Object.keys(FORMATOS);

export function extensionDe(nombre: string): string {
  const punto = nombre.lastIndexOf('.');
  return punto < 0 ? '' : nombre.slice(punto + 1).toLowerCase();
}

function empieza(buffer: Buffer, bytes: number[], desde = 0): boolean {
  return bytes.every((b, i) => buffer[desde + i] === b);
}

function coincideFirma(firma: Formato['firma'], b: Buffer): boolean {
  switch (firma) {
    case 'pdf':
      // Algunos PDF traen basura antes de la cabecera; el estándar admite %PDF en el primer KB.
      return b.subarray(0, 1024).includes('%PDF-');
    case 'zip':
      return empieza(b, [0x50, 0x4b, 0x03, 0x04]);
    case 'ole':
      return empieza(b, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
    case 'png':
      return empieza(b, [0x89, 0x50, 0x4e, 0x47]);
    case 'jpg':
      return empieza(b, [0xff, 0xd8, 0xff]);
    case 'gif':
      return empieza(b, [0x47, 0x49, 0x46, 0x38]);
    case 'webp':
      return empieza(b, [0x52, 0x49, 0x46, 0x46]) && empieza(b, [0x57, 0x45, 0x42, 0x50], 8);
    case 'drawio': {
      const inicio = b.subarray(0, 4096).toString('utf8');
      return inicio.includes('<mxfile') || inicio.includes('<mxGraphModel');
    }
    case 'texto':
      return !b.subarray(0, 8192).includes(0);
  }
}

export interface FormatoDetectado {
  tipo: TipoArchivo;
  mime: string;
  extension: string;
}

/** null si la extensión no está permitida o el contenido no corresponde a ella. */
export function detectarFormato(nombre: string, contenido: Buffer): FormatoDetectado | null {
  const extension = extensionDe(nombre);
  const formato = FORMATOS[extension];
  if (!formato || contenido.length === 0 || !coincideFirma(formato.firma, contenido)) return null;
  return { tipo: formato.tipo, mime: formato.mime, extension };
}
