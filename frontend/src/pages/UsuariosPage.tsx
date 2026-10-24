import { type FormEvent, useState } from 'react';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { Card, CardHeader } from '../components/ui/Card';
import { Chip, EstadoPermisoChip, EstadoUsuarioChip, RolChip } from '../components/ui/Chip';
import { Drawer } from '../components/ui/Drawer';
import { Input, Select } from '../components/ui/Field';
import { IconButton } from '../components/ui/IconButton';
import { BanIcon, CheckIcon, ClockIcon, KeyIcon, LockIcon, RefreshIcon, StarIcon, XIcon } from '../components/ui/icons';
import { PageHeader } from '../components/ui/PageHeader';
import { SelectorVigencia } from '../components/ui/SelectorVigencia';
import { Switch } from '../components/ui/Switch';
import { EmptyRow, Table, TableBody, TableHead, Td, Th } from '../components/ui/Table';
import { Tabs } from '../components/ui/Tabs';
import { useAuth } from '../context/AuthContext';
import { useSecciones } from '../hooks/useBiblioteca';
import {
  useActualizarPermiso,
  useAprobarSolicitud,
  useCambiarEstado,
  useCambiarRol,
  useFijarAccesoHasta,
  useOtorgarPermiso,
  usePermisos,
  useRechazarSolicitud,
  useRestablecerPassword,
  useRevocarPermiso,
  useUsuarios,
} from '../hooks/useUsuarios';
import { mensajeDeError } from '../lib/api';
import { fechaHora, tiempoRestante } from '../lib/fechas';
import { NOMBRES_TIPO, type TipoArchivo, type Usuario, type Vigencia } from '../types/api';

const TIPOS = Object.keys(NOMBRES_TIPO) as TipoArchivo[];

function DrawerVigencia({ titulo, subtitulo, hint, onClose, onGuardar, error, pendiente }: {
  titulo: string;
  subtitulo?: string;
  hint?: string;
  onClose: () => void;
  onGuardar: (v: Vigencia) => void;
  error?: unknown;
  pendiente: boolean;
}) {
  const [vigencia, setVigencia] = useState<Vigencia>({});
  return (
    <Drawer
      open
      title={titulo}
      subtitle={subtitulo}
      onClose={onClose}
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        onGuardar(vigencia);
      }}
      isSubmitting={pendiente}
    >
      <SelectorVigencia label="¿Hasta cuándo puede entrar?" onChange={setVigencia} hint={hint} />
      {error != null && <Alert tone="error">{mensajeDeError(error)}</Alert>}
    </Drawer>
  );
}

function DrawerPassword({ usuario, onClose }: { usuario: Usuario; onClose: () => void }) {
  const restablecer = useRestablecerPassword();
  const [password, setPassword] = useState('');
  return (
    <Drawer
      open
      title="Restablecer contraseña"
      subtitle={usuario.email}
      onClose={onClose}
      onSubmit={(e) => {
        e.preventDefault();
        restablecer.mutate({ id: usuario.id, password }, { onSuccess: onClose });
      }}
      isSubmitting={restablecer.isPending}
    >
      <Input label="Contraseña nueva" type="text" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={10} hint="Mínimo 10 caracteres. Se cierran las sesiones abiertas de esta persona; compártesela por un canal seguro." autoComplete="off" />
      {restablecer.isError && <Alert tone="error">{mensajeDeError(restablecer.error)}</Alert>}
    </Drawer>
  );
}

function DrawerPermisos({ usuario, onClose }: { usuario: Usuario; onClose: () => void }) {
  const secciones = useSecciones();
  const permisos = usePermisos(usuario.id);
  const otorgar = useOtorgarPermiso();
  const actualizar = useActualizarPermiso();
  const revocar = useRevocarPermiso();

  const [seccionId, setSeccionId] = useState('');
  const [descargar, setDescargar] = useState(false);
  const [tipos, setTipos] = useState<TipoArchivo[]>([]);
  const [vigencia, setVigencia] = useState<Vigencia>({});
  const [nota, setNota] = useState('');
  const [claveVigencia, setClaveVigencia] = useState(0);
  const [renovando, setRenovando] = useState<string | null>(null);
  const [vigenciaRenovar, setVigenciaRenovar] = useState<Vigencia>({});

  const nombreSeccion = (id: string | null) => (id ? (secciones.data?.find((s) => s.id === id)?.ruta ?? 'Sección eliminada') : 'Toda la wiki');

  function conceder(e: FormEvent) {
    e.preventDefault();
    otorgar.mutate(
      { usuarioId: usuario.id, seccion_id: seccionId || null, descargar, tipos, nota, ...vigencia },
      {
        onSuccess: () => {
          setNota('');
          setDescargar(false);
          setTipos([]);
          setVigencia({});
          setClaveVigencia((k) => k + 1);
        },
      }
    );
  }

  const error = otorgar.error ?? revocar.error ?? actualizar.error;

  return (
    <Drawer open title="Permisos de acceso" subtitle={`${usuario.nombre} · ${usuario.email}`} onClose={onClose} size="xl" submitLabel="Cerrar" onSubmit={(e) => { e.preventDefault(); onClose(); }}>
      {usuario.rol === 'ADMIN' && <Alert tone="info">Es administrador: ya puede ver y descargar todo, no necesita permisos.</Alert>}

      <Card className="space-y-4">
        <CardHeader title="Conceder acceso" subtitle="Un permiso cubre la sección elegida y todo lo que hay dentro de ella." />
        <form onSubmit={conceder} className="space-y-4">
          <Select label="Sección" value={seccionId} onChange={(e) => setSeccionId(e.target.value)}>
            <option value="">Toda la wiki</option>
            {[...(secciones.data ?? [])]
              .sort((a, b) => a.ruta.localeCompare(b.ruta))
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.ruta}
                </option>
              ))}
          </Select>
          <div>
            <p className="mb-1.5 text-label text-body">Tipos de archivo</p>
            <div className="flex flex-wrap gap-3">
              {TIPOS.map((t) => (
                <label key={t} className="flex items-center gap-1.5 text-sm text-body">
                  <input type="checkbox" checked={tipos.includes(t)} onChange={(e) => setTipos(e.target.checked ? [...tipos, t] : tipos.filter((x) => x !== t))} className="accent-primary" />
                  {NOMBRES_TIPO[t]}
                </label>
              ))}
            </div>
            <p className="mt-1 text-xs text-muted">Sin marcar ninguno = todos los tipos. Ej.: solo «Diagrama» para que vea los draw.io y nada más.</p>
          </div>
          <Switch checked={descargar} onChange={setDescargar} label="Permitir descargar" description="Apagado: puede ver el documento en la wiki pero no bajar el archivo." />
          <SelectorVigencia key={claveVigencia} label="¿Por cuánto tiempo?" onChange={setVigencia} hint="Pasado ese tiempo el permiso deja de valer solo; la cuenta y el permiso quedan registrados." />
          <Input label="Nota (opcional)" value={nota} onChange={(e) => setNota(e.target.value)} maxLength={300} placeholder="Ej.: revisión de QA" />
          {error && <Alert tone="error">{mensajeDeError(error)}</Alert>}
          <Button type="submit" isLoading={otorgar.isPending} disabled={usuario.rol === 'ADMIN'}>
            Conceder permiso
          </Button>
        </form>
      </Card>

      <Table>
        <TableHead>
          <Th>Alcance</Th>
          <Th>Puede</Th>
          <Th>Vigencia</Th>
          <Th>Estado</Th>
          <Th className="text-right">Acciones</Th>
        </TableHead>
        <TableBody>
          {permisos.data?.length === 0 && <EmptyRow colSpan={5}>Esta persona no tiene permisos: no ve nada.</EmptyRow>}
          {permisos.data?.map((p) => (
            <tr key={p.id}>
              <Td>
                <span className="font-semibold text-ink">{nombreSeccion(p.seccion_id)}</span>
                <p className="text-xs text-muted">{p.tipos.length ? p.tipos.map((t) => NOMBRES_TIPO[t]).join(', ') : 'Todos los tipos'}</p>
                {p.nota && <p className="text-xs text-muted">«{p.nota}»</p>}
              </Td>
              <Td>
                <div className="flex gap-1">
                  <Chip tone="primary">Ver</Chip>
                  {p.descargar && <Chip tone="warning">Descargar</Chip>}
                </div>
              </Td>
              <Td className="text-muted">{p.hasta ? `${fechaHora(p.hasta)} (${tiempoRestante(p.hasta)})` : 'Sin vencimiento'}</Td>
              <Td>
                <EstadoPermisoChip estado={p.estado} />
              </Td>
              <Td>
                <div className="flex justify-end gap-2">
                  {p.estado !== 'REVOCADO' && (
                    <>
                      <IconButton tone="success" label="Renovar / cambiar vigencia" icon={<RefreshIcon />} onClick={() => { setRenovando(p.id); setVigenciaRenovar({}); }} />
                      <IconButton tone="danger" label="Revocar" icon={<XIcon />} onClick={() => confirm('¿Revocar este permiso? La persona pierde ese acceso de inmediato.') && revocar.mutate(p.id)} />
                    </>
                  )}
                </div>
              </Td>
            </tr>
          ))}
        </TableBody>
      </Table>

      {renovando && (
        <Card className="space-y-3">
          <CardHeader title="Cambiar vigencia del permiso" subtitle="Cuenta desde ahora." />
          <SelectorVigencia label="Nueva vigencia" onChange={setVigenciaRenovar} />
          <div className="flex gap-2">
            <Button
              onClick={() =>
                actualizar.mutate(
                  { id: renovando, duracion_minutos: vigenciaRenovar.duracion_minutos ?? null, hasta: vigenciaRenovar.hasta ?? null },
                  { onSuccess: () => setRenovando(null) }
                )
              }
              isLoading={actualizar.isPending}
            >
              Aplicar
            </Button>
            <Button variant="secondary" onClick={() => setRenovando(null)}>
              Cancelar
            </Button>
          </div>
        </Card>
      )}
    </Drawer>
  );
}

type Accion = { tipo: 'aprobar' | 'permisos' | 'vigencia' | 'password'; usuario: Usuario };

export default function UsuariosPage() {
  const { usuario: yo } = useAuth();
  const [pestana, setPestana] = useState<'pendientes' | 'todos'>('pendientes');
  const lista = useUsuarios(pestana === 'pendientes' ? 'PENDIENTE' : undefined);
  const pendientes = useUsuarios('PENDIENTE');
  const aprobar = useAprobarSolicitud();
  const rechazar = useRechazarSolicitud();
  const estado = useCambiarEstado();
  const rol = useCambiarRol();
  const acceso = useFijarAccesoHasta();
  const [accion, setAccion] = useState<Accion | null>(null);

  const error = rechazar.error ?? estado.error ?? rol.error;
  const cerrar = () => setAccion(null);

  return (
    <>
      <PageHeader title="Usuarios y permisos" subtitle="Aprueba solicitudes, decide qué puede ver o descargar cada persona y por cuánto tiempo." />
      <Tabs
        items={[
          { key: 'pendientes', label: 'Solicitudes', contador: pendientes.data?.length || undefined },
          { key: 'todos', label: 'Todos los usuarios' },
        ]}
        value={pestana}
        onChange={(k) => setPestana(k as typeof pestana)}
      />
      {error && <Alert tone="error">{mensajeDeError(error)}</Alert>}

      <Table>
        <TableHead>
          <Th>Persona</Th>
          <Th>Rol</Th>
          <Th>Estado</Th>
          <Th>Acceso</Th>
          <Th className="text-right">Acciones</Th>
        </TableHead>
        <TableBody>
          {lista.isLoading && <EmptyRow colSpan={5}>Cargando…</EmptyRow>}
          {lista.data?.length === 0 && <EmptyRow colSpan={5}>{pestana === 'pendientes' ? 'No hay solicitudes pendientes.' : 'Sin usuarios.'}</EmptyRow>}
          {lista.data?.map((u) => (
            <tr key={u.id}>
              <Td>
                <span className="font-semibold text-ink">{u.nombre}</span>
                <p className="text-xs text-muted">{u.email}</p>
                {u.estado === 'PENDIENTE' && u.motivo_solicitud && <p className="mt-1 max-w-sm text-xs text-body">«{u.motivo_solicitud}»</p>}
              </Td>
              <Td>
                <RolChip rol={u.rol} />
              </Td>
              <Td>
                <EstadoUsuarioChip estado={u.estado} />
              </Td>
              <Td className="text-muted">
                {u.estado === 'ACTIVO' ? (u.acceso_hasta ? `Temporal: ${tiempoRestante(u.acceso_hasta)}` : 'Sin vencimiento') : '—'}
                {u.ultimo_acceso && <p className="text-xs">Último ingreso {fechaHora(u.ultimo_acceso)}</p>}
              </Td>
              <Td>
                <div className="flex justify-end gap-2">
                  {(u.estado === 'PENDIENTE' || u.estado === 'RECHAZADO') && (
                    <IconButton tone="success" label="Aprobar" icon={<CheckIcon />} onClick={() => setAccion({ tipo: 'aprobar', usuario: u })} />
                  )}
                  {u.estado === 'PENDIENTE' && (
                    <IconButton tone="danger" label="Rechazar" icon={<XIcon />} onClick={() => confirm(`¿Rechazar la solicitud de ${u.email}?`) && rechazar.mutate(u.id)} />
                  )}
                  {(u.estado === 'ACTIVO' || u.estado === 'INACTIVO') && (
                    <IconButton tone="edit" label="Permisos" icon={<KeyIcon />} onClick={() => setAccion({ tipo: 'permisos', usuario: u })} />
                  )}
                  {u.estado === 'ACTIVO' && (
                    <>
                      <IconButton tone="neutral" label="Vigencia de la cuenta" icon={<ClockIcon />} onClick={() => setAccion({ tipo: 'vigencia', usuario: u })} />
                      <IconButton
                        tone="neutral"
                        label={u.rol === 'ADMIN' ? 'Quitar rol de administrador' : 'Hacer administrador'}
                        icon={<StarIcon />}
                        disabled={u.id === yo?.id}
                        onClick={() => confirm(u.rol === 'ADMIN' ? `¿Quitar el rol de administrador a ${u.email}?` : `¿Hacer administrador a ${u.email}? Podrá ver todo y gestionar usuarios.`) && rol.mutate({ id: u.id, rol: u.rol === 'ADMIN' ? 'USUARIO' : 'ADMIN' })}
                      />
                      <IconButton tone="neutral" label="Restablecer contraseña" icon={<LockIcon />} onClick={() => setAccion({ tipo: 'password', usuario: u })} />
                      <IconButton
                        tone="danger"
                        label={u.id === yo?.id ? 'No puedes suspender tu propia cuenta' : 'Suspender (se puede reactivar)'}
                        icon={<BanIcon />}
                        disabled={u.id === yo?.id}
                        onClick={() => confirm(`¿Suspender a ${u.email}? No se borra nada: al reactivarlo conserva sus permisos.`) && estado.mutate({ id: u.id, estado: 'INACTIVO' })}
                      />
                    </>
                  )}
                  {u.estado === 'INACTIVO' && <IconButton tone="success" label="Reactivar" icon={<RefreshIcon />} onClick={() => estado.mutate({ id: u.id, estado: 'ACTIVO' })} />}
                </div>
              </Td>
            </tr>
          ))}
        </TableBody>
      </Table>

      {accion?.tipo === 'aprobar' && (
        <DrawerVigencia
          titulo="Aprobar solicitud"
          subtitulo={`${accion.usuario.nombre} · ${accion.usuario.email}`}
          hint="Elige un tiempo para una cuenta temporal; al vencer no entra, pero no se borra y puedes renovarla."
          pendiente={aprobar.isPending}
          error={aprobar.error}
          onClose={cerrar}
          onGuardar={(v) => aprobar.mutate({ id: accion.usuario.id, ...v }, { onSuccess: cerrar })}
        />
      )}
      {accion?.tipo === 'vigencia' && (
        <DrawerVigencia
          titulo="Vigencia de la cuenta"
          subtitulo={`${accion.usuario.nombre} · ${accion.usuario.email}`}
          hint="Cuenta desde ahora. «Sin vencimiento» quita el límite."
          pendiente={acceso.isPending}
          error={acceso.error}
          onClose={cerrar}
          onGuardar={(v) => acceso.mutate({ id: accion.usuario.id, ...v }, { onSuccess: cerrar })}
        />
      )}
      {accion?.tipo === 'permisos' && <DrawerPermisos usuario={accion.usuario} onClose={cerrar} />}
      {accion?.tipo === 'password' && <DrawerPassword usuario={accion.usuario} onClose={cerrar} />}
    </>
  );
}
