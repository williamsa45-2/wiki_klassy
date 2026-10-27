import { useQuery } from '@tanstack/react-query';
import { renderAsync } from 'docx-preview';
import { useEffect, useRef, useState } from 'react';
import { api, mensajeDeError } from '../../lib/api';
import { hojasDeDrawio, type HojaDrawio } from '../../lib/drawio';
import { indiceDeDocx, indiceDePdf, type EntradaIndice, type EntradaIndiceDocx } from '../../lib/indice';
import type { Documento } from '../../types/api';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { Select } from '../ui/Field';
import { ArrowLeftIcon, ChevronRightIcon } from '../ui/icons';
import { Spinner } from '../ui/Spinner';

/** Los bytes se piden con sesión y viven solo en memoria: no hay una URL que se pueda compartir o abrir sin permiso. */
function useArchivo(id: string) {
  return useQuery({ queryKey: ['archivo', id], queryFn: () => api.blob(`/documentos/${id}/archivo`), staleTime: 0, gcTime: 60_000 });
}

function useUrlDeBlob(blob: Blob | undefined) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!blob) return;
    const nueva = URL.createObjectURL(blob);
    setUrl(nueva);
    return () => URL.revokeObjectURL(nueva);
  }, [blob]);
  return url;
}

/** Lleva directo a una sección sin tener que abrir la tabla de contenido del archivo. */
function SelectorIndice({ entradas, onElegir }: { entradas: EntradaIndice[]; onElegir: (i: number) => void }) {
  if (!entradas.length) return null;
  return (
    <Select
      label="Ir a la sección"
      hideLabel
      value=""
      onChange={(e) => {
        if (e.target.value !== '') onElegir(Number(e.target.value));
      }}
    >
      <option value="">Índice: ir a la sección…</option>
      {entradas.map((e, i) => (
        <option key={i} value={i}>
          {'   '.repeat(e.nivel)}
          {e.titulo}
        </option>
      ))}
    </Select>
  );
}

function VisorPdf({ blob, titulo }: { blob: Blob; titulo: string }) {
  const url = useUrlDeBlob(blob);
  const { data: indice = [] } = useQuery({ queryKey: ['indice-pdf', blob], queryFn: () => indiceDePdf(blob), staleTime: Infinity, retry: false });
  const entradas = indice.filter((e) => e.pagina != null);
  // El visor del navegador solo lee #page al cargar: cada salto vuelve a montar el iframe (el blob ya está en memoria).
  const [salto, setSalto] = useState({ pagina: 1, vez: 0 });
  if (!url) return null;
  // Sin la barra del visor del navegador (trae «descargar» e «imprimir», que son otro permiso).
  return (
    <div className="space-y-3">
      <SelectorIndice entradas={entradas} onElegir={(i) => setSalto((s) => ({ pagina: entradas[i]?.pagina ?? 1, vez: s.vez + 1 }))} />
      <iframe
        key={salto.vez}
        title={titulo}
        src={`${url}#toolbar=0&navpanes=0&page=${salto.pagina}`}
        className="h-[75vh] w-full rounded-lg border border-border bg-surface"
      />
    </div>
  );
}

function VisorImagen({ blob, titulo }: { blob: Blob; titulo: string }) {
  const url = useUrlDeBlob(blob);
  return url ? <img src={url} alt={titulo} className="mx-auto max-h-[75vh] max-w-full rounded-lg border border-border bg-surface" /> : null;
}

function VisorTexto({ blob }: { blob: Blob }) {
  const [texto, setTexto] = useState('');
  useEffect(() => {
    void blob.text().then(setTexto);
  }, [blob]);
  return <pre className="max-h-[75vh] overflow-auto whitespace-pre-wrap rounded-lg border border-border bg-surface p-4 text-sm text-ink">{texto}</pre>;
}

function VisorDocx({ blob }: { blob: Blob }) {
  const contenedor = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [indice, setIndice] = useState<EntradaIndiceDocx[]>([]);
  useEffect(() => {
    const destino = contenedor.current;
    if (!destino) return;
    setIndice([]);
    renderAsync(blob, destino, undefined, { inWrapper: true, ignoreWidth: false })
      .then((documento) => setIndice(indiceDeDocx(documento, destino)))
      .catch(() => setError('No se pudo mostrar este documento Word. Puedes descargarlo si tienes permiso.'));
  }, [blob]);

  const irA = (i: number) => {
    const destino = contenedor.current;
    const elemento = indice[i]?.elemento;
    if (!destino || !elemento) return;
    // Solo se desplaza el visor, no toda la página.
    const top = elemento.getBoundingClientRect().top - destino.getBoundingClientRect().top + destino.scrollTop - 16;
    destino.scrollTo({ top, behavior: 'smooth' });
  };

  return (
    <div className="space-y-3">
      {error && <Alert tone="warning">{error}</Alert>}
      <SelectorIndice entradas={indice} onElegir={irA} />
      <div ref={contenedor} className="max-h-[75vh] overflow-auto rounded-lg border border-border bg-soft" />
    </div>
  );
}

const ORIGEN_DRAWIO = 'https://embed.diagrams.net';
// lightbox=1 + chrome=0: modo visor, sin barras de edición; el XML viaja por postMessage, no se sube a ningún servidor.
const URL_DRAWIO = `${ORIGEN_DRAWIO}/?embed=1&proto=json&spin=1&ui=min&lightbox=1&chrome=0&noSaveBtn=1&noExitBtn=1`;

/**
 * El visor sin barras (chrome=0) no muestra las pestañas de hojas de draw.io: la wiki muestra el nombre de cada hoja
 * como su título y deja elegirla. Al visor se le manda una sola hoja a la vez.
 */
function VisorDrawio({ blob, titulo }: { blob: Blob; titulo: string }) {
  const marco = useRef<HTMLIFrameElement>(null);
  const [hojas, setHojas] = useState<HojaDrawio[]>([]);
  const [indice, setIndice] = useState(0);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    setIndice(0);
    void blob.text().then((t) => setHojas(hojasDeDrawio(t)));
  }, [blob]);

  useEffect(() => {
    const alMensaje = (e: MessageEvent) => {
      if (e.origin !== ORIGEN_DRAWIO || e.source !== marco.current?.contentWindow) return;
      try {
        if (JSON.parse(e.data as string).event === 'init') setListo(true);
      } catch {
        // Mensajes que no son JSON no son del protocolo del visor.
      }
    };
    window.addEventListener('message', alMensaje);
    return () => window.removeEventListener('message', alMensaje);
  }, []);

  const hoja = hojas[indice];
  useEffect(() => {
    if (listo && hoja) marco.current?.contentWindow?.postMessage(JSON.stringify({ action: 'load', xml: hoja.xml, autosave: 0 }), ORIGEN_DRAWIO);
  }, [listo, hoja]);

  const nombreDe = (h: HojaDrawio, i: number) => h.nombre || `Hoja ${i + 1}`;
  return (
    <div className="space-y-3">
      {hoja && (hojas.length > 1 || hoja.nombre) && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-h3 text-ink">{nombreDe(hoja, indice)}</h2>
            {hojas.length > 1 && (
              <p className="text-xs text-muted">
                Diagrama {indice + 1} de {hojas.length}
              </p>
            )}
          </div>
          {hojas.length > 1 && (
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={() => setIndice((i) => i - 1)} disabled={indice === 0} aria-label="Diagrama anterior">
                <ArrowLeftIcon className="h-4 w-4" />
              </Button>
              <Select label="Diagrama" hideLabel value={indice} onChange={(e) => setIndice(Number(e.target.value))}>
                {hojas.map((h, i) => (
                  <option key={i} value={i}>
                    {i + 1}. {nombreDe(h, i)}
                  </option>
                ))}
              </Select>
              <Button variant="secondary" onClick={() => setIndice((i) => i + 1)} disabled={indice === hojas.length - 1} aria-label="Diagrama siguiente">
                <ChevronRightIcon className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}
      <iframe ref={marco} title={hoja?.nombre || titulo} src={URL_DRAWIO} className="h-[75vh] w-full rounded-lg border border-border bg-surface" />
    </div>
  );
}

export function VisorDocumento({ doc }: { doc: Documento }) {
  const { data: blob, isLoading, error } = useArchivo(doc.id);

  if (isLoading) return <Spinner />;
  if (error || !blob) return <Alert tone="error">{mensajeDeError(error)}</Alert>;

  switch (doc.tipo) {
    case 'PDF':
      return <VisorPdf blob={blob} titulo={doc.titulo} />;
    case 'IMAGEN':
      return <VisorImagen blob={blob} titulo={doc.titulo} />;
    case 'TEXTO':
      return <VisorTexto blob={blob} />;
    case 'DOCX':
      return <VisorDocx blob={blob} />;
    case 'DRAWIO':
      return <VisorDrawio blob={blob} titulo={doc.titulo} />;
    default:
      return (
        <Alert tone="info">
          Este tipo de archivo ({doc.nombre_archivo}) no se puede mostrar en la wiki.{' '}
          {doc.puede_descargar ? 'Descárgalo para abrirlo.' : 'No tienes permiso de descarga.'}
        </Alert>
      );
  }
}
