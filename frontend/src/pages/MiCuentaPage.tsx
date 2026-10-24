import { useMutation } from '@tanstack/react-query';
import { type FormEvent, useState } from 'react';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { Card, CardHeader } from '../components/ui/Card';
import { EstadoUsuarioChip, RolChip } from '../components/ui/Chip';
import { Input } from '../components/ui/Field';
import { PageHeader } from '../components/ui/PageHeader';
import { useAuth } from '../context/AuthContext';
import { api, mensajeDeError } from '../lib/api';
import { fechaHora, tiempoRestante } from '../lib/fechas';

export default function MiCuentaPage() {
  const { usuario, reemplazarToken } = useAuth();
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const cambiar = useMutation({
    mutationFn: () => api.post<{ token: string }>('/auth/cambiar-password', { actual, nueva }),
    onSuccess: (r) => {
      // El servidor cerró las demás sesiones; esta sigue con el token nuevo.
      reemplazarToken(r.token);
      setActual('');
      setNueva('');
    },
  });

  function enviar(e: FormEvent) {
    e.preventDefault();
    cambiar.mutate();
  }

  if (!usuario) return null;
  return (
    <>
      <PageHeader title="Mi cuenta" />
      <Card className="space-y-2">
        <CardHeader title={usuario.nombre} subtitle={usuario.email} />
        <div className="flex flex-wrap items-center gap-2">
          <RolChip rol={usuario.rol} />
          <EstadoUsuarioChip estado={usuario.estado} />
        </div>
        {usuario.acceso_hasta && (
          <Alert tone="warning">
            Tu acceso es temporal: {tiempoRestante(usuario.acceso_hasta)} ({fechaHora(usuario.acceso_hasta)}).
          </Alert>
        )}
      </Card>
      <Card>
        <CardHeader title="Cambiar contraseña" />
        <form onSubmit={enviar} className="max-w-sm space-y-4">
          <Input label="Contraseña actual" type="password" value={actual} onChange={(e) => setActual(e.target.value)} required autoComplete="current-password" />
          <Input label="Contraseña nueva" type="password" value={nueva} onChange={(e) => setNueva(e.target.value)} required minLength={10} hint="Mínimo 10 caracteres." autoComplete="new-password" />
          {cambiar.isError && <Alert tone="error">{mensajeDeError(cambiar.error)}</Alert>}
          {cambiar.isSuccess && <Alert tone="success">Contraseña actualizada. Las demás sesiones se cerraron.</Alert>}
          <Button type="submit" isLoading={cambiar.isPending}>
            Cambiar contraseña
          </Button>
        </form>
      </Card>
    </>
  );
}
