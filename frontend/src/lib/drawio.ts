// Los nombres que draw.io pone solo («Page-1», «Página-1») no dicen nada del diagrama: no sirven como título.
const NOMBRE_POR_DEFECTO = /^(page|p[aá]gina)-\d+$/i;

/** Título a partir de los nombres de las páginas del archivo; null si no tiene páginas con nombre propio. */
export async function tituloDesdePaginas(archivo: File): Promise<string | null> {
  const dom = new DOMParser().parseFromString(await archivo.text(), 'application/xml');
  if (dom.getElementsByTagName('parsererror').length) return null;
  const nombres = Array.from(dom.getElementsByTagName('diagram'))
    .map((pagina) => pagina.getAttribute('name')?.trim() ?? '')
    .filter((nombre) => nombre && !NOMBRE_POR_DEFECTO.test(nombre));
  return nombres.length ? [...new Set(nombres)].join(' · ').slice(0, 200) : null;
}
