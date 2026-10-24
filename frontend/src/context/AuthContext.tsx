import { useQueryClient } from '@tanstack/react-query';
import { type ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { alPerderSesion, api, guardarToken, leerToken } from '../lib/api';
import type { Usuario } from '../types/api';

interface AuthContextValue {
  usuario: Usuario | null;
  /** true mientras se comprueba el token guardado al abrir la página. */
  cargando: boolean;
  esAdmin: boolean;
  iniciarSesion: (email: string, password: string) => Promise<void>;
  cerrarSesion: () => void;
  /** Tras cambiar la contraseña el servidor invalida las sesiones y entrega un token nuevo. */
  reemplazarToken: (token: string) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState(() => leerToken() !== null);

  const cerrarSesion = useCallback(() => {
    guardarToken(null);
    setUsuario(null);
    // Lo cacheado era de esa persona: no debe verlo quien entre después en este navegador.
    queryClient.clear();
  }, [queryClient]);

  useEffect(() => {
    alPerderSesion(cerrarSesion);
  }, [cerrarSesion]);

  useEffect(() => {
    if (!leerToken()) return;
    api
      .get<Usuario>('/auth/yo')
      .then(setUsuario)
      .catch(() => guardarToken(null))
      .finally(() => setCargando(false));
  }, []);

  const iniciarSesion = useCallback(async (email: string, password: string) => {
    const r = await api.post<{ token: string; usuario: Usuario }>('/auth/login', { email, password });
    guardarToken(r.token);
    setUsuario(r.usuario);
  }, []);

  const valor = useMemo<AuthContextValue>(
    () => ({
      usuario,
      cargando,
      esAdmin: usuario?.rol === 'ADMIN',
      iniciarSesion,
      cerrarSesion,
      reemplazarToken: guardarToken,
    }),
    [usuario, cargando, iniciarSesion, cerrarSesion]
  );
  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
