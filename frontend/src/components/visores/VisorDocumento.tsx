import { useQuery } from '@tanstack/react-query';
import { renderAsync } from 'docx-preview';
import { useEffect, useRef, useState } from 'react';
import { api, mensajeDeError } from '../../lib/api';
import type { Documento } from '../../types/api';
import { Alert } from '../ui/Alert';
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

function VisorPdf({ blob, titulo }: { blob: Blob; titulo: string }) {
  const url = useUrlDeBlob(blob);
  if (!url) return null;
  // Sin la barra del visor del navegador (trae «descargar» e «imprimir», que son otro permiso).
  return <iframe title={titulo} src={`${url}#toolbar=0&navpanes=0`} className="h-[75vh] w-full rounded-lg border border-border bg-surface" />;
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
  useEffect(() => {
    if (!contenedor.current) return;
    renderAsync(blob, contenedor.current, undefined, { inWrapper: true, ignoreWidth: false }).catch(() =>
      setError('No se pudo mostrar este documento Word. Puedes descargarlo si tienes permiso.')
    );
  }, [blob]);
  return (
    <>
      {error && <Alert tone="warning">{error}</Alert>}
      <div ref={contenedor} className="max-h-[75vh] overflow-auto rounded-lg border border-border bg-soft" />
    </>
  );
}

const ORIGEN_DRAWIO = 'https://embed.diagrams.net';
// lightbox=1 + chrome=0: modo visor, sin barras de edición; el XML viaja por postMessage, no se sube a ningún servidor.
const URL_DRAWIO = `${ORIGEN_DRAWIO}/?embed=1&proto=json&spin=1&ui=min&lightbox=1&chrome=0&noSaveBtn=1&noExitBtn=1`;

/** Las hojas se ven con el título del documento en la wiki (numerado si hay varias); el archivo guardado no cambia. */
function nombrarHojas(xml: string, titulo: string): string {
  const dom = new DOMParser().parseFromString(xml, 'application/xml');
  if (dom.getElementsByTagName('parsererror').length) return xml;
  const raiz = dom.documentElement;
  if (raiz.nodeName === 'mxGraphModel') {
    const archivo = dom.createElement('mxfile');
    const hoja = dom.createElement('diagram');
    dom.replaceChild(archivo, raiz);
    hoja.appendChild(raiz);
    archivo.appendChild(hoja);
  }
  const hojas = Array.from(dom.getElementsByTagName('diagram'));
  hojas.forEach((hoja, i) => hoja.setAttribute('name', hojas.length > 1 ? `${titulo} (${i + 1} de ${hojas.length})` : titulo));
  return new XMLSerializer().serializeToString(dom);
}

function VisorDrawio({ blob, titulo }: { blob: Blob; titulo: string }) {
  const marco = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    let xml: string | null = null;
    void blob.text().then((t) => {
      xml = nombrarHojas(t, titulo);
    });
    const alMensaje = async (e: MessageEvent) => {
      if (e.origin !== ORIGEN_DRAWIO || e.source !== marco.current?.contentWindow) return;
      let datos: { event?: string } = {};
      try {
        datos = JSON.parse(e.data as string);
      } catch {
        return;
      }
      if (datos.event === 'init') {
        xml ??= nombrarHojas(await blob.text(), titulo);
        marco.current?.contentWindow?.postMessage(JSON.stringify({ action: 'load', xml, autosave: 0 }), ORIGEN_DRAWIO);
      }
    };
    window.addEventListener('message', alMensaje);
    return () => window.removeEventListener('message', alMensaje);
  }, [blob, titulo]);
  return <iframe ref={marco} title={titulo} src={URL_DRAWIO} className="h-[75vh] w-full rounded-lg border border-border bg-surface" />;
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
