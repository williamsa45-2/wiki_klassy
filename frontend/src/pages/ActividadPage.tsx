import { useState } from 'react';
import { TablaHistorial } from '../components/historial/TablaHistorial';
import { Alert } from '../components/ui/Alert';
import { PageHeader } from '../components/ui/PageHeader';
import { Tabs } from '../components/ui/Tabs';
import { useActividad } from '../hooks/useUsuarios';
import { mensajeDeError } from '../lib/api';

export default function ActividadPage() {
  const [pestana, setPestana] = useState<'cambios' | 'todo'>('cambios');
  const { data, isLoading, error } = useActividad(pestana === 'cambios');
  return (
    <>
      <PageHeader title="Actividad" subtitle="Los últimos 200 movimientos: quién agregó, actualizó o eliminó qué, y quién entró, vio o descargó." />
      <Tabs
        items={[
          { key: 'cambios', label: 'Cambios' },
          { key: 'todo', label: 'Todo (incluye consultas)' },
        ]}
        value={pestana}
        onChange={(k) => setPestana(k as typeof pestana)}
      />
      {error && <Alert tone="error">{mensajeDeError(error)}</Alert>}
      <TablaHistorial filas={data} cargando={isLoading} />
    </>
  );
}
