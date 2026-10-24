import { Alert } from '../components/ui/Alert';
import { Chip } from '../components/ui/Chip';
import { PageHeader } from '../components/ui/PageHeader';
import { EmptyRow, Table, TableBody, TableHead, Td, Th } from '../components/ui/Table';
import { useActividad } from '../hooks/useUsuarios';
import { mensajeDeError } from '../lib/api';
import { fechaHora } from '../lib/fechas';

const ACCIONES: Record<string, string> = {
  LOGIN: 'Inició sesión',
  VER: 'Vio',
  DESCARGAR: 'Descargó',
  SUBIR: 'Subió',
  ELIMINAR: 'Eliminó',
  PERMISO_CONCEDIDO: 'Concedió permiso',
  PERMISO_REVOCADO: 'Revocó permiso',
  USUARIO_GESTIONADO: 'Gestionó usuario',
};

export default function ActividadPage() {
  const { data, isLoading, error } = useActividad();
  return (
    <>
      <PageHeader title="Actividad" subtitle="Los últimos 200 movimientos: quién entró, vio o descargó qué." />
      {error && <Alert tone="error">{mensajeDeError(error)}</Alert>}
      <Table>
        <TableHead>
          <Th>Fecha</Th>
          <Th>Usuario</Th>
          <Th>Acción</Th>
          <Th>Detalle</Th>
          <Th>IP</Th>
        </TableHead>
        <TableBody>
          {isLoading && <EmptyRow colSpan={5}>Cargando…</EmptyRow>}
          {data?.length === 0 && <EmptyRow colSpan={5}>Aún no hay actividad.</EmptyRow>}
          {data?.map((a) => (
            <tr key={a.id}>
              <Td className="whitespace-nowrap text-muted">{fechaHora(a.fecha)}</Td>
              <Td>{a.usuario ? `${a.usuario.nombre}` : '—'}</Td>
              <Td>
                <Chip tone={a.accion === 'DESCARGAR' ? 'warning' : a.accion === 'ELIMINAR' || a.accion === 'PERMISO_REVOCADO' ? 'danger' : 'neutral'}>
                  {ACCIONES[a.accion] ?? a.accion}
                </Chip>
              </Td>
              <Td>{a.documento?.titulo ?? a.detalle}</Td>
              <Td className="text-muted">{a.ip}</Td>
            </tr>
          ))}
        </TableBody>
      </Table>
    </>
  );
}
