import { useMutation } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { VisorDocumento } from '../components/visores/VisorDocumento';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { Chip } from '../components/ui/Chip';
import { ArrowLeftIcon, DownloadIcon, LockIcon } from '../components/ui/icons';
import { PageHeader } from '../components/ui/PageHeader';
import { Spinner } from '../components/ui/Spinner';
import { useDocumento } from '../hooks/useBiblioteca';
import { mensajeDeError } from '../lib/api';
import { descargarArchivo } from '../lib/descargas';
import { fecha, tamanoLegible } from '../lib/fechas';
import { NOMBRES_TIPO } from '../types/api';

export default function DocumentoPage() {
  const { id } = useParams();
  const { data: doc, isLoading, error } = useDocumento(id);
  const descargar = useMutation({ mutationFn: descargarArchivo });

  if (isLoading) return <Spinner />;
  if (error || !doc) {
    return (
      <>
        <Alert tone="error">{error ? mensajeDeError(error) : 'Documento no encontrado.'}</Alert>
        <Link to="/biblioteca" className="text-sm font-semibold text-primary">
          ← Volver a la biblioteca
        </Link>
      </>
    );
  }

  return (
    <>
      <Link to={`/biblioteca?seccion=${doc.seccion_id}`} className="inline-flex items-center gap-1 text-sm font-semibold text-primary">
        <ArrowLeftIcon className="h-4 w-4" />
        {doc.ruta}
      </Link>
      <PageHeader
        title={doc.titulo}
        subtitle={doc.descripcion || undefined}
        action={
          doc.puede_descargar ? (
            <Button variant="outline" onClick={() => descargar.mutate(doc)} isLoading={descargar.isPending}>
              <DownloadIcon className="h-4 w-4" />
              Descargar
            </Button>
          ) : (
            <span title="Tu permiso es solo de lectura">
              <Chip tone="warning">
                <LockIcon className="mr-1 h-3.5 w-3.5" />
                Solo lectura
              </Chip>
            </span>
          )
        }
      />
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
        <Chip tone={doc.tipo === 'DRAWIO' ? 'primary' : 'neutral'}>{NOMBRES_TIPO[doc.tipo]}</Chip>
        <span>{doc.nombre_archivo}</span>·<span>{tamanoLegible(doc.tamano)}</span>·<span>Actualizado {fecha(doc.actualizado)}</span>
        {doc.etiquetas.map((e) => (
          <Chip key={e}>{e}</Chip>
        ))}
      </div>
      {descargar.isError && <Alert tone="error">{mensajeDeError(descargar.error)}</Alert>}
      <VisorDocumento doc={doc} />
    </>
  );
}
