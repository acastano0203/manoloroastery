import type { ReactNode } from 'react'
import { ClientesProvider } from './features/clientes/hooks/useClientes'
import { ConfigProvider } from './features/configuracion/hooks/useConfig'
import { RegistrosProvider } from './features/registros/hooks/useRegistros'

/** Datos compartidos por todas las páginas (solo con sesión iniciada). */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ConfigProvider>
      <ClientesProvider>
        <RegistrosProvider>{children}</RegistrosProvider>
      </ClientesProvider>
    </ConfigProvider>
  )
}
