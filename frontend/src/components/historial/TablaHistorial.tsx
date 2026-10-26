import { Link } from 'react-router-dom';
import { fechaHora } from '../../lib/fechas';
import type { Actividad } from '../../types/api';
import { Chip } from '../ui/Chip';
import { EmptyRow, Table, TableBody, TableHead, Td, Th } from '../ui/Table';

type Tono = 'primary' | 'success' | 'warning' | 'danger' | 'neutral';

const ACCIONES: Record<string, { texto: string; tono: Tono }> = {
  LOGIN: { texto: 'Inició sesión', tono: 'neutral' },
  VER: { texto: 'Vio', tono: 'neutral' },
  DESCARGAR: { texto: 'Descargó', tono: 'warning' },
  SUBIR: { texto: 'Agregó', tono: 'success' },
  NUEVA_VERSION: { texto: 'Actualizó el archivo', tono: 'primary' },
  ACTUALIZAR: { texto: 'Editó datos', tono: 'primary' },
  ELIMINAR: { texto: 'Eliminó', tono: 'danger' },
  SECCION_CREADA: { texto: 'Creó sección', tono: 'success' },
  SECCION_ACTUALIZADA: { texto: 'Editó sección', tono: 'primary' },
  SECCION_ELIMINADA: { texto: 'Eliminó sección', tono: 'danger' },
  PERMISO_CONCEDIDO: { texto: 'Concedió permiso', tono: 'success' },
  PERMISO_ACTUALIZADO: { texto: 'Editó permiso', tono: 'primary' },
  PERMISO_REVOCADO: { texto: 'Revocó permiso', tono: 'danger' },
  USUARIO_GESTIONADO: { texto: 'Gestionó usuario', tono: 'primary' },
  REGISTRO_SOLICITADO: { texto: 'Pidió acceso', tono: 'warning' },
  PASSWORD_CAMBIADA: { texto: 'Cambió su contraseña', tono: 'neutral' },
};

/** `conDocumento`: enlaza al documento de cada fila (se omite dentro de la página del propio documento). */
export function TablaHistorial({ filas, cargando, conDocumento = true }: { filas: Actividad[] | undefined; cargando: boolean; conDocumento?: boolean }) {
  return (
    <Table>
      <TableHead>
        <Th>Fecha</Th>
        <Th>Usuario</Th>
        <Th>Acción</Th>
        <Th>Detalle</Th>
        <Th>IP</Th>
      </TableHead>
      <TableBody>
        {cargando && <EmptyRow colSpan={5}>Cargando…</EmptyRow>}
        {filas?.length === 0 && <EmptyRow colSpan={5}>Aún no hay movimientos.</EmptyRow>}
        {filas?.map((a) => {
          const accion = ACCIONES[a.accion] ?? { texto: a.accion, tono: 'neutral' as const };
          // Un documento eliminado ya no tiene página: su título queda en el detalle.
          const enlace = conDocumento && a.documento_id && a.accion !== 'ELIMINAR';
          return (
            <tr key={a.id}>
              <Td className="whitespace-nowrap text-muted">{fechaHora(a.fecha)}</Td>
              <Td>
                {a.usuario ? (
                  <>
                    <span className="text-ink">{a.usuario.nombre}</span>
                    <p className="text-xs text-muted">{a.usuario.email}</p>
                  </>
                ) : (
                  '—'
                )}
              </Td>
              <Td>
                <Chip tone={accion.tono}>{accion.texto}</Chip>
              </Td>
              <Td>
                {enlace ? (
                  <Link to={`/documentos/${a.documento_id}`} className="font-semibold text-primary">
                    {a.detalle || 'Ver documento'}
                  </Link>
                ) : (
                  a.detalle || '—'
                )}
              </Td>
              <Td className="text-muted">{a.ip}</Td>
            </tr>
          );
        })}
      </TableBody>
    </Table>
  );
}
