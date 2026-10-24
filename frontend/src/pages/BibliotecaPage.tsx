import { type FormEvent, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { Chip } from '../components/ui/Chip';
import { Card } from '../components/ui/Card';
import { Input, Select } from '../components/ui/Field';
import { FolderIcon, SearchIcon } from '../components/ui/icons';
import { PageHeader } from '../components/ui/PageHeader';
import { Spinner } from '../components/ui/Spinner';
import { EmptyRow, Table, TableBody, TableHead, Td, Th } from '../components/ui/Table';
import { useAuth } from '../context/AuthContext';
import { useDocumentos, useSecciones } from '../hooks/useBiblioteca';
import { fecha, tamanoLegible } from '../lib/fechas';
import { mensajeDeError } from '../lib/api';
import { NOMBRES_TIPO, type Seccion, type TipoArchivo } from '../types/api';

interface Nodo extends Seccion {
  hijas: Nodo[];
}

function armarArbol(secciones: Seccion[]): Nodo[] {
  const porId = new Map<string, Nodo>(secciones.map((s) => [s.id, { ...s, hijas: [] }]));
  const raices: Nodo[] = [];
  for (const nodo of porId.values()) {
    const padre = nodo.padre_id ? porId.get(nodo.padre_id) : undefined;
    (padre ? padre.hijas : raices).push(nodo);
  }
  return raices;
}

function RamaArbol({ nodo, activa, nivel }: { nodo: Nodo; activa: string | null; nivel: number }) {
  return (
    <li>
      <Link
        to={`/biblioteca?seccion=${nodo.id}`}
        style={{ paddingLeft: 12 + nivel * 14 }}
        className={`flex items-center justify-between gap-2 rounded-lg py-1.5 pr-3 text-sm ${
          activa === nodo.id ? 'bg-primary-soft font-semibold text-primary' : 'text-body hover:bg-soft'
        }`}
      >
        <span className="flex min-w-0 items-center gap-2">
          <FolderIcon className="h-4 w-4 shrink-0" />
          <span className="truncate">{nodo.nombre}</span>
        </span>
        {nodo.total_documentos > 0 && <span className="text-xs text-muted">{nodo.total_documentos}</span>}
      </Link>
      {nodo.hijas.length > 0 && (
        <ul>
          {nodo.hijas.map((h) => (
            <RamaArbol key={h.id} nodo={h} activa={activa} nivel={nivel + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function BibliotecaPage() {
  const { esAdmin } = useAuth();
  const [params, setParams] = useSearchParams();
  const seccionId = params.get('seccion');
  const q = params.get('q') ?? '';
  const tipo = (params.get('tipo') ?? '') as TipoArchivo | '';
  const [busqueda, setBusqueda] = useState(q);

  const secciones = useSecciones();
  const arbol = useMemo(() => armarArbol(secciones.data ?? []), [secciones.data]);
  const seccion = secciones.data?.find((s) => s.id === seccionId);
  // Con búsqueda se mira en toda la wiki (lo que el usuario puede ver); sin ella, solo la sección elegida.
  const documentos = useDocumentos({ q, tipo, seccion_id: q ? undefined : (seccionId ?? undefined) }, !!q || !!seccionId || !!tipo);

  function actualizar(cambios: Record<string, string | null>) {
    const siguiente = new URLSearchParams(params);
    for (const [clave, valor] of Object.entries(cambios)) {
      if (valor) siguiente.set(clave, valor);
      else siguiente.delete(clave);
    }
    setParams(siguiente);
  }

  function buscar(e: FormEvent) {
    e.preventDefault();
    actualizar({ q: busqueda.trim() || null });
  }

  const hayFiltro = !!q || !!seccionId || !!tipo;

  return (
    <>
      <PageHeader
        title={seccion?.nombre ?? 'Biblioteca'}
        subtitle={q ? `Resultados para «${q}»` : (seccion?.ruta ?? 'Toda la documentación del proyecto a la que tienes acceso.')}
      />

      <div className="grid gap-4 lg:grid-cols-[18rem_1fr]">
        <Card className="h-fit p-2">
          {secciones.isLoading && <Spinner />}
          {secciones.isError && <Alert tone="error">{mensajeDeError(secciones.error)}</Alert>}
          {secciones.data && arbol.length === 0 && (
            <p className="p-3 text-sm text-muted">
              {esAdmin ? 'Aún no hay secciones. Crea la primera en «Gestionar contenido».' : 'Todavía no tienes acceso a ninguna sección. Pide permiso a un administrador.'}
            </p>
          )}
          <ul className="space-y-0.5">
            {arbol.map((n) => (
              <RamaArbol key={n.id} nodo={n} activa={seccionId} nivel={0} />
            ))}
          </ul>
        </Card>

        <div className="min-w-0 space-y-4">
          <form onSubmit={buscar} className="flex flex-wrap items-end gap-3">
            <div className="min-w-[14rem] flex-1">
              <Input label="Buscar" hideLabel placeholder="Buscar por título, etiqueta o sección" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
            </div>
            <div className="w-44">
              <Select label="Tipo" hideLabel value={tipo} onChange={(e) => actualizar({ tipo: e.target.value || null })}>
                <option value="">Todos los tipos</option>
                {(Object.keys(NOMBRES_TIPO) as TipoArchivo[]).map((t) => (
                  <option key={t} value={t}>
                    {NOMBRES_TIPO[t]}
                  </option>
                ))}
              </Select>
            </div>
            <Button type="submit">
              <SearchIcon className="h-4 w-4" />
              Buscar
            </Button>
            {q && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setBusqueda('');
                  actualizar({ q: null });
                }}
              >
                Limpiar
              </Button>
            )}
          </form>

          {documentos.isError && <Alert tone="error">{mensajeDeError(documentos.error)}</Alert>}

          <Table>
            <TableHead>
              <Th>Documento</Th>
              <Th>Tipo</Th>
              <Th>Ubicación</Th>
              <Th>Tamaño</Th>
              <Th>Actualizado</Th>
            </TableHead>
            <TableBody>
              {!hayFiltro && (
                <EmptyRow colSpan={5}>Elige una sección del árbol o busca por nombre.</EmptyRow>
              )}
              {hayFiltro && documentos.isLoading && (
                <EmptyRow colSpan={5}>Cargando…</EmptyRow>
              )}
              {hayFiltro && documentos.data?.length === 0 && <EmptyRow colSpan={5}>No hay documentos que puedas ver con ese criterio.</EmptyRow>}
              {documentos.data?.map((d) => (
                <tr key={d.id} className="hover:bg-soft/60">
                  <Td>
                    <Link to={`/documentos/${d.id}`} className="font-semibold text-ink hover:text-primary">
                      {d.titulo}
                    </Link>
                    {d.etiquetas.length > 0 && <p className="mt-0.5 text-xs text-muted">{d.etiquetas.join(' · ')}</p>}
                  </Td>
                  <Td>
                    <Chip tone={d.tipo === 'DRAWIO' ? 'primary' : 'neutral'}>{NOMBRES_TIPO[d.tipo]}</Chip>
                  </Td>
                  <Td className="text-muted">{d.ruta}</Td>
                  <Td className="whitespace-nowrap text-muted">{tamanoLegible(d.tamano)}</Td>
                  <Td className="whitespace-nowrap text-muted">{fecha(d.actualizado)}</Td>
                </tr>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  );
}
