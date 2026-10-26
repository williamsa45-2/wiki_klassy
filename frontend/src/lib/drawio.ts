// Los nombres que draw.io pone solo («Page-1», «Página-1») no dicen nada del diagrama: no sirven como título.
const NOMBRE_POR_DEFECTO = /^(page|p[aá]gina)-\d+$/i;

export interface HojaDrawio {
  /** Nombre de la hoja en draw.io: es el título de ese diagrama. Vacío si la hoja no tiene un nombre propio. */
  nombre: string;
  /** Un mxfile con solo esta hoja, listo para mandarlo al visor. */
  xml: string;
}

/** Las hojas del archivo, en orden. Un archivo sin <diagram> (solo mxGraphModel) o ilegible es una sola hoja sin nombre. */
export function hojasDeDrawio(xml: string): HojaDrawio[] {
  const dom = new DOMParser().parseFromString(xml, 'application/xml');
  const diagramas = dom.getElementsByTagName('parsererror').length ? [] : Array.from(dom.getElementsByTagName('diagram'));
  if (!diagramas.length) return [{ nombre: '', xml }];
  const serializador = new XMLSerializer();
  return diagramas.map((diagrama) => {
    const nombre = diagrama.getAttribute('name')?.trim() ?? '';
    return {
      nombre: NOMBRE_POR_DEFECTO.test(nombre) ? '' : nombre,
      xml: `<mxfile>${serializador.serializeToString(diagrama)}</mxfile>`,
    };
  });
}

/**
 * Título sugerido al subir: el nombre de la hoja si el archivo tiene una sola. Con varias hojas cada una ya muestra
 * su nombre en el visor, y unirlos todos haría un título ilegible: se deja el nombre del archivo.
 */
export async function tituloDesdePaginas(archivo: File): Promise<string | null> {
  const hojas = hojasDeDrawio(await archivo.text());
  return hojas.length === 1 && hojas[0]?.nombre ? hojas[0].nombre.slice(0, 200) : null;
}
