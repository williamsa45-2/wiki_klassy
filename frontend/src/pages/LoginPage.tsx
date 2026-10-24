import { useMutation } from '@tanstack/react-query';
import { type FormEvent, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input, Textarea } from '../components/ui/Field';
import { Tabs } from '../components/ui/Tabs';
import { useAuth } from '../context/AuthContext';
import { api, mensajeDeError } from '../lib/api';

export default function LoginPage() {
  const { iniciarSesion } = useAuth();
  const navigate = useNavigate();
  const ubicacion = useLocation();
  const desde = (ubicacion.state as { desde?: string } | null)?.desde ?? '/biblioteca';
  const [modo, setModo] = useState<'entrar' | 'registro'>('entrar');
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [motivo, setMotivo] = useState('');

  const entrar = useMutation({
    mutationFn: () => iniciarSesion(email, password),
    onSuccess: () => navigate(desde, { replace: true }),
  });
  const registrar = useMutation({
    mutationFn: () => api.post<{ message: string }>('/auth/registro', { nombre, email, password, motivo }),
  });

  function enviar(e: FormEvent) {
    e.preventDefault();
    if (modo === 'entrar') entrar.mutate();
    else registrar.mutate();
  }

  const mutacion = modo === 'entrar' ? entrar : registrar;

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md space-y-4">
        <div className="text-center">
          <h1 className="text-h2 text-ink">Wiki Klassy</h1>
          <p className="mt-1 text-sm text-muted">Documentación del proyecto. Solo para personas autorizadas.</p>
        </div>
        <Card className="space-y-4">
          <Tabs
            items={[
              { key: 'entrar', label: 'Entrar' },
              { key: 'registro', label: 'Solicitar acceso' },
            ]}
            value={modo}
            onChange={(k) => {
              setModo(k as 'entrar' | 'registro');
              entrar.reset();
              registrar.reset();
            }}
          />

          {registrar.isSuccess && modo === 'registro' ? (
            <Alert tone="success">{registrar.data.message}</Alert>
          ) : (
            <form onSubmit={enviar} className="space-y-4">
              {modo === 'registro' && <Input label="Nombre completo" value={nombre} onChange={(e) => setNombre(e.target.value)} required minLength={2} autoComplete="name" />}
              <Input label="Correo" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
              <Input
                label="Contraseña"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={modo === 'registro' ? 10 : undefined}
                hint={modo === 'registro' ? 'Mínimo 10 caracteres.' : undefined}
                autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'}
              />
              {modo === 'registro' && (
                <>
                  <Textarea label="¿Para qué necesitas acceso?" value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={500} />
                  <Alert tone="info">Tu cuenta no se activa hasta que un administrador apruebe la solicitud.</Alert>
                </>
              )}
              {mutacion.isError && <Alert tone="error">{mensajeDeError(mutacion.error)}</Alert>}
              <Button type="submit" className="w-full" isLoading={mutacion.isPending}>
                {modo === 'entrar' ? 'Entrar' : 'Enviar solicitud'}
              </Button>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
