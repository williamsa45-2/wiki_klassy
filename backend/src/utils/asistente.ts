import { normalizar, raiz, tokensDeConsulta } from './texto';

export type TipoDestino = 'DOCUMENTO' | 'SECCION' | 'PANTALLA';

export interface DestinoAsistente {
  /** Identificador estable dentro de la consulta (`documento:<id>`); es lo único que el modelo puede devolver. */
  id: string;
  tipo: TipoDestino;
  nombre: string;
  /** Frontend: `/documentos/<id>`, `/biblioteca?seccion=<id>`, `/admin/usuarios`… */
  ruta: string;
  /** Dónde vive («Historias de usuario / Backend») y qué es; ayuda a distinguir títulos parecidos. */
  contexto: string;
  etiquetas: string[];
  /** Palabras con las que la gente nombra el destino (sinónimos de su tipo de archivo, de la pantalla…). */
  claves: string[];
}

export interface RespuestaAsistente {
  destino: DestinoAsistente | null;
  alternativas: DestinoAsistente[];
  mensaje: string;
  origen: 'IA' | 'LOCAL';
}

export const SINONIMOS_TIPO: Record<string, string[]> = {
  DRAWIO: ['diagrama', 'diagramas', 'drawio', 'draw io', 'flujo', 'uml', 'esquema'],
  DOCX: ['word', 'docx', 'documento'],
  PDF: ['pdf'],
  TEXTO: ['texto', 'txt', 'notas'],
  IMAGEN: ['imagen', 'foto', 'captura'],
};

export interface Coincidencia {
  destino: DestinoAsistente;
  puntaje: number;
  /** Fracción de las palabras de la pregunta que encontraron algo en este destino (0–1). */
  cobertura: number;
}

interface Campo {
  tokens: string[];
  peso: number;
}

function camposDe(d: DestinoAsistente): Campo[] {
  const tokens = (texto: string) => normalizar(texto).split(' ').filter(Boolean);
  return [
    { tokens: tokens(d.nombre), peso: 4 },
    { tokens: d.etiquetas.flatMap(tokens), peso: 3 },
    { tokens: d.claves.flatMap(tokens), peso: 3 },
    { tokens: tokens(d.contexto), peso: 2 },
  ];
}

function pesoDeToken(token: string, campos: Campo[]): number {
  let mejor = 0;
  for (const campo of campos) {
    for (const t of campo.tokens) {
      if (raiz(t) === raiz(token)) mejor = Math.max(mejor, campo.peso);
      else if (token.length >= 4 && t.length >= 4 && (t.includes(token) || token.includes(t))) mejor = Math.max(mejor, campo.peso / 2);
    }
  }
  return mejor;
}

/** Ordena los destinos de mayor a menor por lo bien que responden a la pregunta; descarta los que no coinciden en nada. */
export function buscarLocal(pregunta: string, destinos: DestinoAsistente[]): Coincidencia[] {
  const consulta = normalizar(pregunta);
  const tokens = tokensDeConsulta(pregunta);
  if (tokens.length === 0) return [];

  const resultados: Coincidencia[] = [];
  for (const destino of destinos) {
    const campos = camposDe(destino);
    let puntaje = 0;
    let acertados = 0;
    for (const token of tokens) {
      const peso = pesoDeToken(token, campos);
      if (peso > 0) {
        puntaje += peso;
        acertados += 1;
      }
    }
    if (acertados === 0) continue;
    // Si la pregunta contiene el título entero, es casi seguro ese.
    const nombre = normalizar(destino.nombre);
    if (nombre.length >= 6 && ` ${consulta} `.includes(` ${nombre} `)) puntaje += 8;
    resultados.push({ destino, puntaje, cobertura: acertados / tokens.length });
  }
  return resultados.sort((a, b) => b.puntaje - a.puntaje);
}

/** La primera es clara si cubre la mayoría de la pregunta y saca ventaja sobre la segunda: ahí se navega sola; si no, se deja elegir. */
export function destinoClaro(coincidencias: Coincidencia[]): Coincidencia | null {
  const [primera, segunda] = coincidencias;
  if (!primera || primera.cobertura < 0.6) return null;
  if (!segunda || primera.puntaje >= segunda.puntaje + 3) return primera;
  return null;
}

interface SalidaDelModelo {
  destino_id?: unknown;
  alternativas?: unknown;
  mensaje?: unknown;
}

const MENSAJE_SIN_RESPUESTA = 'No encontré nada para eso entre lo que puedes ver. Prueba con otras palabras.';

/**
 * El modelo solo propone: se descarta cualquier id que no estuviera en la lista que se le dio, así que una pregunta con
 * instrucciones inventadas no puede mandar a otro lugar ni a un documento sin permiso.
 */
export function validarRespuesta(salida: SalidaDelModelo, destinos: DestinoAsistente[]): RespuestaAsistente {
  const mensaje =
    typeof salida.mensaje === 'string' && salida.mensaje.trim() ? salida.mensaje.trim().slice(0, 400) : MENSAJE_SIN_RESPUESTA;
  const porId = new Map(destinos.map((d) => [d.id, d]));
  const destino = typeof salida.destino_id === 'string' ? (porId.get(salida.destino_id) ?? null) : null;
  const alternativas = (Array.isArray(salida.alternativas) ? salida.alternativas : [])
    .map((id) => (typeof id === 'string' ? porId.get(id) : undefined))
    .filter((d): d is DestinoAsistente => !!d && d.id !== destino?.id)
    .filter((d, i, todos) => todos.findIndex((x) => x.id === d.id) === i)
    .slice(0, 3);
  return { destino, alternativas, mensaje, origen: 'IA' };
}
