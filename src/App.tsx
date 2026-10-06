import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppProviders } from './AppProviders'
import { Layout } from './components/layout/Layout'
import { RequireAuth } from './features/auth/components/RequireAuth'
import { AuthProvider } from './features/auth/hooks/useAuth'
import { supabaseConfigurado } from './lib/supabase'
import { ClientesPage } from './pages/ClientesPage'
import { ConfiguracionPage } from './pages/ConfiguracionPage'
import { DetalleRegistroPage } from './pages/DetalleRegistroPage'
import { LoginPage } from './pages/LoginPage'
import { NuevoRegistroPage } from './pages/NuevoRegistroPage'
import { RegistrosPage } from './pages/RegistrosPage'
import { RemisionPage } from './pages/RemisionPage'
import { SetupPage } from './pages/SetupPage'

export default function App() {
  if (!supabaseConfigurado) return <SetupPage />

  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            element={
              <RequireAuth>
                <AppProviders>
                  <Layout />
                </AppProviders>
              </RequireAuth>
            }
          >
            <Route index element={<RegistrosPage />} />
            <Route path="nuevo" element={<NuevoRegistroPage />} />
            <Route path="registros/:id" element={<DetalleRegistroPage />} />
            <Route path="registros/:id/editar" element={<NuevoRegistroPage />} />
            <Route path="registros/:id/remision" element={<RemisionPage />} />
            <Route path="clientes" element={<ClientesPage />} />
            <Route path="configuracion" element={<ConfiguracionPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
