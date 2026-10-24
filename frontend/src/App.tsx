import type { ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { Spinner } from './components/ui/Spinner';
import { useAuth } from './context/AuthContext';
import ActividadPage from './pages/ActividadPage';
import BibliotecaPage from './pages/BibliotecaPage';
import ContenidoPage from './pages/ContenidoPage';
import DocumentoPage from './pages/DocumentoPage';
import LoginPage from './pages/LoginPage';
import MiCuentaPage from './pages/MiCuentaPage';
import UsuariosPage from './pages/UsuariosPage';

/** Sin sesión no se ve nada de la wiki: se guarda a dónde iba para volver después de entrar. */
function RutaPrivada({ children, soloAdmin }: { children: ReactNode; soloAdmin?: boolean }) {
  const { usuario, cargando, esAdmin } = useAuth();
  const ubicacion = useLocation();
  if (cargando) return <Spinner />;
  if (!usuario) return <Navigate to="/entrar" replace state={{ desde: ubicacion.pathname + ubicacion.search }} />;
  if (soloAdmin && !esAdmin) return <Navigate to="/biblioteca" replace />;
  return children;
}

export default function App() {
  const { usuario, cargando } = useAuth();
  return (
    <Routes>
      <Route path="/entrar" element={cargando ? <Spinner /> : usuario ? <Navigate to="/biblioteca" replace /> : <LoginPage />} />
      <Route
        element={
          <RutaPrivada>
            <AppShell />
          </RutaPrivada>
        }
      >
        <Route path="/biblioteca" element={<BibliotecaPage />} />
        <Route path="/documentos/:id" element={<DocumentoPage />} />
        <Route path="/mi-cuenta" element={<MiCuentaPage />} />
        <Route
          path="/admin/contenido"
          element={
            <RutaPrivada soloAdmin>
              <ContenidoPage />
            </RutaPrivada>
          }
        />
        <Route
          path="/admin/usuarios"
          element={
            <RutaPrivada soloAdmin>
              <UsuariosPage />
            </RutaPrivada>
          }
        />
        <Route
          path="/admin/actividad"
          element={
            <RutaPrivada soloAdmin>
              <ActividadPage />
            </RutaPrivada>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/biblioteca" replace />} />
    </Routes>
  );
}
