import { type FormEvent, useRef, useState } from 'react';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { Chip } from '../components/ui/Chip';
import { Drawer } from '../components/ui/Drawer';
import { Input, Select, Textarea } from '../components/ui/Field';
import { IconButton } from '../components/ui/IconButton';
import { PencilIcon, PlusIcon, TrashIcon, UploadIcon } from '../components/ui/icons';
import { PageHeader } from '../components/ui/PageHeader';
import { EmptyRow, Table, TableBody, TableHead, Td, Th } from '../components/ui/Table';
import { Tabs } from '../components/ui/Tabs';
import {
  useActualizarDocumento,
  useActualizarSeccion,
  useCrearSeccion,
  useDocumentos,
  useEliminarDocumento,
  useEliminarSeccion,
  useReemplazarArchivo,
  useSecciones,
  useSubirDocumento,
} from '../hooks/useBiblioteca';
import { mensajeDeError } from '../lib/api';
import { tituloDesdePaginas } from '../lib/drawio';
import { fecha, tamanoLegible } from '../lib/fechas';
import { NOMBRES_TIPO, type Documento, type Seccion } from '../types/api';

const ACEPTADOS = '.pdf,.docx,.doc,.xlsx,.xls,.pptx,.ppt,.drawio,.dio,.txt,.md,.csv,.json,.png,.jpg,.jpeg,.gif,.webp';

function OpcionesSeccion({ secciones, excluir }: { secciones: Seccion[]; excluir?: string }) {
  return (
    <>
      {[...secciones]
        .filter((s) => s.id !== excluir)
        .sort((a, b) => a.ruta.localeCompare(b.ruta))
        .map((s) => (
          <option key={s.id} value={s.id}>
            {s.ruta}
          </option>
        ))}
    </>
  );
}

function DrawerSeccion({ seccion, secciones, abierto, onClose }: { seccion: Seccion | null; secciones: Seccion[]; abierto: boolean; onClose: () => void }) {
  const crear = useCrearSeccion();
  const actualizar = useActualizarSeccion();
  const [nombre, setNombre] = useState(seccion?.nombre ?? '');
  const [descripcion, setDescripcion] = useState(seccion?.descripcion ?? '');
  const [padreId, setPadreId] = useState(seccion?.padre_id ?? '');
  const mutacion = seccion ? actualizar : crear;

  function enviar(e: FormEvent) {
    e.preventDefault();
    const datos = { nombre, descripcion, padre_id: padreId || null };
    if (seccion) actualizar.mutate({ id: seccion.id, ...datos }, { onSuccess: onClose });
    else crear.mutate(datos, { onSuccess: onClose });
  }

  return (
    <Drawer open={abierto} title={seccion ? 'Editar sección' : 'Nueva sección'} onClose={onClose} onSubmit={enviar} isSubmitting={mutacion.isPending}>
      <Input label="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required maxLength={120} />
      <Select label="Dentro de" value={padreId} onChange={(e) => setPadreId(e.target.value)}>
        <option value="">— Primer nivel —</option>
        <OpcionesSeccion secciones={secciones} excluir={seccion?.id} />
      </Select>
      <Textarea label="Descripción" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} maxLength={500} />
      {mutacion.isError && <Alert tone="error">{mensajeDeError(mutacion.error)}</Alert>}
    </Drawer>
  );
}

// Igual que el servidor (collation es, strength 1): sin distinguir mayúsculas ni tildes.
const claveDeTitulo = (titulo: string) => titulo.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

function DrawerDocumento({
  documento,
  documentos,
  secciones,
  abierto,
  onClose,
}: {
  documento: Documento | null;
  documentos: Documento[];
  secciones: Seccion[];
  abierto: boolean;
  onClose: () => void;
}) {
  const subir = useSubirDocumento();
  const actualizar = useActualizarDocumento();
  const [titulo, setTitulo] = useState(documento?.titulo ?? '');
  const [descripcion, setDescripcion] = useState(documento?.descripcion ?? '');
  const [seccionId, setSeccionId] = useState(documento?.seccion_id ?? '');
  const [etiquetas, setEtiquetas] = useState(documento?.etiquetas.join(', ') ?? '');
  const [archivo, setArchivo] = useState<File | null>(null);
  const mutacion = documento ? actualizar : subir;
  // Al subir, un título que ya existe actualiza ese documento (nuevo archivo) en vez de crear otro.
  const existente = !documento && titulo.trim() ? documentos.find((d) => claveDeTitulo(d.titulo) === claveDeTitulo(titulo)) : undefined;

  function enviar(e: FormEvent) {
    e.preventDefault();
    if (documento) {
      actualizar.mutate(
        { id: documento.id, titulo, descripcion, seccion_id: seccionId, etiquetas: etiquetas.split(',').map((t) => t.trim()).filter(Boolean) },
        { onSuccess: onClose }
      );
      return;
    }
    if (!archivo) return;
    const form = new FormData();
    form.set('titulo', titulo);
    form.set('descripcion', descripcion);
    form.set('seccion_id', seccionId);
    form.set('etiquetas', etiquetas);
    form.set('archivo', archivo);
    subir.mutate(form, { onSuccess: onClose });
  }

  return (
    <Drawer
      open={abierto}
      title={documento ? 'Editar documento' : 'Subir documento'}
      onClose={onClose}
      onSubmit={enviar}
      submitLabel={documento ? 'Guardar' : existente ? 'Actualizar' : 'Subir'}
      isSubmitting={mutacion.isPending}
      submitDisabled={!documento && !archivo}
    >
      {!documento && (
        <div>
          <label htmlFor="archivo" className="mb-1.5 block text-label text-body">
            Archivo
          </label>
          <input
            id="archivo"
            type="file"
            accept={ACEPTADOS}
            required
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              setArchivo(f);
              if (!f) return;
              if (!titulo) setTitulo(f.name.replace(/\.[^.]+$/, ''));
              // En un draw.io el título lo dan sus páginas, aunque ya hubiera uno escrito.
              if (/\.(drawio|dio)$/i.test(f.name)) void tituloDesdePaginas(f).then((t) => t && setTitulo(t));
            }}
            className="block w-full text-sm text-body file:mr-3 file:rounded-lg file:border-0 file:bg-primary-soft file:px-3 file:py-2 file:font-semibold file:text-primary"
          />
          <p className="mt-1 text-xs text-muted">PDF, Word, draw.io (.drawio), texto, imágenes, Excel y PowerPoint. Máximo 50 MB.</p>
        </div>
      )}
      <Input label="Título" value={titulo} onChange={(e) => setTitulo(e.target.value)} required maxLength={200} />
      {existente && (
        <Alert tone="info">
          Ya existe «{existente.titulo}» en {existente.ruta}. Se subirá como una actualización: se reemplaza su archivo y queda en su historial. La
          descripción y las etiquetas vacías no borran las que tiene.
        </Alert>
      )}
      <Select label="Sección" value={seccionId} onChange={(e) => setSeccionId(e.target.value)} required>
        <option value="">— Elige una sección —</option>
        <OpcionesSeccion secciones={secciones} />
      </Select>
      <Input label="Etiquetas" value={etiquetas} onChange={(e) => setEtiquetas(e.target.value)} hint="Separadas por coma. El asistente las usa para encontrar el documento (ej. boletín, periodo, publicación)." />
      <Textarea label="Descripción" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} maxLength={1000} />
      {mutacion.isError && <Alert tone="error">{mensajeDeError(mutacion.error)}</Alert>}
    </Drawer>
  );
}

export default function ContenidoPage() {
  const [pestana, setPestana] = useState<'secciones' | 'documentos'>('documentos');
  const secciones = useSecciones();
  const documentos = useDocumentos({});
  const eliminarSeccion = useEliminarSeccion();
  const eliminarDocumento = useEliminarDocumento();
  const reemplazar = useReemplazarArchivo();
  const entrada = useRef<HTMLInputElement>(null);
  const [aReemplazar, setAReemplazar] = useState<string | null>(null);
  const [drawerSeccion, setDrawerSeccion] = useState<{ seccion: Seccion | null } | null>(null);
  const [drawerDocumento, setDrawerDocumento] = useState<{ documento: Documento | null } | null>(null);

  const lista = secciones.data ?? [];
  const error = eliminarSeccion.error ?? eliminarDocumento.error ?? reemplazar.error;

  return (
    <>
      <PageHeader
        title="Gestionar contenido"
        subtitle="Organiza la wiki en secciones y sube los documentos del proyecto."
        action={
          pestana === 'secciones' ? (
            <Button onClick={() => setDrawerSeccion({ seccion: null })}>
              <PlusIcon className="h-4 w-4" />
              Nueva sección
            </Button>
          ) : (
            <Button onClick={() => setDrawerDocumento({ documento: null })} disabled={lista.length === 0}>
              <UploadIcon className="h-4 w-4" />
              Subir documento
            </Button>
          )
        }
      />
      <Tabs
        items={[
          { key: 'documentos', label: 'Documentos' },
          { key: 'secciones', label: 'Secciones' },
        ]}
        value={pestana}
        onChange={(k) => setPestana(k as typeof pestana)}
      />
      {error && <Alert tone="error">{mensajeDeError(error)}</Alert>}
      {lista.length === 0 && secciones.isSuccess && <Alert tone="info">Empieza creando una sección (por ejemplo «Historias de usuario» y dentro «Backend»); los documentos se suben dentro de una sección.</Alert>}

      <input
        ref={entrada}
        type="file"
        accept={ACEPTADOS}
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f && aReemplazar) {
            const form = new FormData();
            form.set('archivo', f);
            reemplazar.mutate({ id: aReemplazar, form });
          }
          e.target.value = '';
        }}
      />

      {pestana === 'secciones' ? (
        <Table>
          <TableHead>
            <Th>Sección</Th>
            <Th>Documentos</Th>
            <Th className="text-right">Acciones</Th>
          </TableHead>
          <TableBody>
            {lista.length === 0 && <EmptyRow colSpan={3}>Sin secciones.</EmptyRow>}
            {[...lista]
              .sort((a, b) => a.ruta.localeCompare(b.ruta))
              .map((s) => (
                <tr key={s.id}>
                  <Td>
                    <span className="font-semibold text-ink">{s.ruta}</span>
                    {s.descripcion && <p className="text-xs text-muted">{s.descripcion}</p>}
                  </Td>
                  <Td>{s.total_documentos}</Td>
                  <Td>
                    <div className="flex justify-end gap-2">
                      <IconButton tone="edit" label="Editar" icon={<PencilIcon />} onClick={() => setDrawerSeccion({ seccion: s })} />
                      <IconButton
                        tone="danger"
                        label="Eliminar"
                        icon={<TrashIcon />}
                        onClick={() => confirm(`¿Eliminar la sección «${s.nombre}»? Solo se puede si está vacía.`) && eliminarSeccion.mutate(s.id)}
                      />
                    </div>
                  </Td>
                </tr>
              ))}
          </TableBody>
        </Table>
      ) : (
        <Table>
          <TableHead>
            <Th>Documento</Th>
            <Th>Tipo</Th>
            <Th>Sección</Th>
            <Th>Tamaño</Th>
            <Th>Actualizado</Th>
            <Th className="text-right">Acciones</Th>
          </TableHead>
          <TableBody>
            {documentos.data?.length === 0 && <EmptyRow colSpan={6}>Aún no hay documentos.</EmptyRow>}
            {documentos.data?.map((d) => (
              <tr key={d.id}>
                <Td>
                  <span className="font-semibold text-ink">{d.titulo}</span>
                  <p className="text-xs text-muted">{d.nombre_archivo}</p>
                </Td>
                <Td>
                  <Chip>{NOMBRES_TIPO[d.tipo]}</Chip>
                </Td>
                <Td className="text-muted">{d.ruta}</Td>
                <Td className="whitespace-nowrap text-muted">{tamanoLegible(d.tamano)}</Td>
                <Td className="whitespace-nowrap text-muted">{fecha(d.actualizado)}</Td>
                <Td>
                  <div className="flex justify-end gap-2">
                    <IconButton tone="edit" label="Editar datos" icon={<PencilIcon />} onClick={() => setDrawerDocumento({ documento: d })} />
                    <IconButton
                      tone="neutral"
                      label="Reemplazar archivo"
                      icon={<UploadIcon />}
                      onClick={() => {
                        setAReemplazar(d.id);
                        entrada.current?.click();
                      }}
                    />
                    <IconButton tone="danger" label="Eliminar" icon={<TrashIcon />} onClick={() => confirm(`¿Eliminar «${d.titulo}» y su archivo? No se puede deshacer.`) && eliminarDocumento.mutate(d.id)} />
                  </div>
                </Td>
              </tr>
            ))}
          </TableBody>
        </Table>
      )}

      {/* key: el formulario arranca limpio cada vez que se abre con otro registro */}
      {drawerSeccion && <DrawerSeccion key={drawerSeccion.seccion?.id ?? 'nueva'} seccion={drawerSeccion.seccion} secciones={lista} abierto onClose={() => setDrawerSeccion(null)} />}
      {drawerDocumento && <DrawerDocumento key={drawerDocumento.documento?.id ?? 'nuevo'} documento={drawerDocumento.documento} documentos={documentos.data ?? []} secciones={lista} abierto onClose={() => setDrawerDocumento(null)} />}
    </>
  );
}
