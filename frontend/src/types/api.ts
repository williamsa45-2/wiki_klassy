export type Rol = 'ADMIN' | 'USUARIO';
export type EstadoUsuario = 'PENDIENTE' | 'ACTIVO' | 'INACTIVO' | 'RECHAZADO';
export type TipoArchivo = 'PDF' | 'DOCX' | 'DRAWIO' | 'TEXTO' | 'IMAGEN' | 'OTRO';

export const NOMBRES_TIPO: Record<TipoArchivo, string> = {
  PDF: 'PDF',
  DOCX: 'Word',
  DRAWIO: 'Diagrama',
  TEXTO: 'Texto',
  IMAGEN: 'Imagen',
  OTRO: 'Otro',
};

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: Rol;
  estado: EstadoUsuario;
  motivo_solicitud: string;
  acceso_hasta: string | null;
  ultimo_acceso: string | null;
  creado: string;
}

export interface Seccion {
  id: string;
  nombre: string;
  descripcion: string;
  padre_id: string | null;
  orden: number;
  ruta: string;
  total_documentos: number;
}

export interface Documento {
  id: string;
  titulo: string;
  descripcion: string;
  etiquetas: string[];
  tipo: TipoArchivo;
  seccion_id: string;
  ruta: string;
  nombre_archivo: string;
  tamano: number;
  actualizado: string;
  puede_descargar: boolean;
}

export interface Permiso {
  id: string;
  seccion_id: string | null;
  ver: boolean;
  descargar: boolean;
  tipos: TipoArchivo[];
  desde: string | null;
  hasta: string | null;
  revocado_en: string | null;
  nota: string;
  estado: 'VIGENTE' | 'VENCIDO' | 'REVOCADO' | 'PROGRAMADO';
  vigente: boolean;
}

/** «Por cuánto tiempo»: una duración o una fecha; sin ninguna no hay límite. El servidor usa su propio reloj. */
export interface Vigencia {
  duracion_minutos?: number | null;
  hasta?: string | null;
}

export interface DestinoAsistente {
  id: string;
  tipo: 'DOCUMENTO' | 'SECCION' | 'PANTALLA';
  nombre: string;
  ruta: string;
  contexto: string;
  etiquetas: string[];
}

export interface RespuestaAsistente {
  destino: DestinoAsistente | null;
  alternativas: DestinoAsistente[];
  mensaje: string;
  origen: 'IA' | 'LOCAL';
}

export interface Actividad {
  id: string;
  accion: string;
  detalle: string;
  ip: string;
  fecha: string;
  usuario: { id: string; nombre: string; email: string } | null;
  documento: { id: string; titulo: string } | null;
}
