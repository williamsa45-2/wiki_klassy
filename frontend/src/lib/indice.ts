export interface EntradaIndice {
  titulo: string;
  /** 0 = título principal; cada nivel más se sangra en el selector. */
  nivel: number;
}

export interface EntradaIndicePdf extends EntradaIndice {
  /** Página (desde 1) a la que lleva el marcador; null si el marcador no apunta a una página del archivo. */
  pagina: number | null;
}

export interface EntradaIndiceDocx extends EntradaIndice {
  elemento: HTMLElement;
}

interface EstiloDocx {
  cssName?: string;
  paragraphProps?: { outlineLevel?: number };
}

/**
 * Los títulos de un Word ya pintado por docx-preview. Se reconocen por el nivel de esquema de su estilo (outlineLvl),
 * no por el nombre: el id del estilo cambia con el idioma de Word («Heading1», «Ttulo1»…), el nivel de esquema no.
 */
export function indiceDeDocx(documento: unknown, contenedor: HTMLElement): EntradaIndiceDocx[] {
  const estilos = ((documento as { stylesPart?: { styles?: EstiloDocx[] } })?.stylesPart?.styles ?? []);
  const nivelPorClase = new Map<string, number>();
  for (const e of estilos) {
    const nivel = e.paragraphProps?.outlineLevel;
    // Word usa 0–8 para los títulos; 9 es «texto independiente».
    if (e.cssName && nivel != null && nivel < 9) nivelPorClase.set(e.cssName, nivel);
  }
  if (!nivelPorClase.size) return [];

  const entradas: EntradaIndiceDocx[] = [];
  for (const p of Array.from(contenedor.querySelectorAll('p'))) {
    const clase = Array.from(p.classList).find((c) => nivelPorClase.has(c));
    const titulo = p.textContent?.replace(/\s+/g, ' ').trim();
    if (clase && titulo) entradas.push({ titulo, nivel: nivelPorClase.get(clase)!, elemento: p });
  }
  // Si el primer título usado es de nivel 2, que empiece sin sangría.
  const minimo = Math.min(...entradas.map((e) => e.nivel));
  return entradas.map((e) => ({ ...e, nivel: e.nivel - minimo }));
}

interface ItemOutline {
  title: string;
  dest: string | unknown[] | null;
  items: ItemOutline[];
}

/** Los marcadores del PDF (el índice que Word genera al exportar «crear marcadores usando títulos»), en orden y aplanados. */
export async function indiceDePdf(blob: Blob): Promise<EntradaIndicePdf[]> {
  const pdfjs = await import('pdfjs-dist');
  if (!pdfjs.GlobalWorkerOptions.workerPort) {
    // Como worker empaquetado (.js) y no como URL a un .mjs: así no depende de que el servidor sirva .mjs como JavaScript.
    const { default: TrabajadorPdf } = await import('pdfjs-dist/build/pdf.worker.min.mjs?worker');
    pdfjs.GlobalWorkerOptions.workerPort = new TrabajadorPdf();
  }
  const carga = pdfjs.getDocument({ data: new Uint8Array(await blob.arrayBuffer()) });
  const pdf = await carga.promise;
  try {
    const outline = ((await pdf.getOutline()) ?? []) as ItemOutline[];
    const paginaDe = async (dest: ItemOutline['dest']): Promise<number | null> => {
      try {
        const explicito = typeof dest === 'string' ? await pdf.getDestination(dest) : dest;
        const ref = explicito?.[0];
        if (ref == null) return null;
        const indice = typeof ref === 'number' ? ref : await pdf.getPageIndex(ref as Parameters<typeof pdf.getPageIndex>[0]);
        return indice + 1;
      } catch {
        return null;
      }
    };
    const entradas: EntradaIndicePdf[] = [];
    const recorrer = async (items: ItemOutline[], nivel: number) => {
      for (const item of items) {
        const titulo = item.title.replace(/\s+/g, ' ').trim();
        if (titulo) entradas.push({ titulo, nivel, pagina: await paginaDe(item.dest) });
        await recorrer(item.items ?? [], nivel + 1);
      }
    };
    await recorrer(outline, 0);
    return entradas;
  } finally {
    void carga.destroy();
  }
}
