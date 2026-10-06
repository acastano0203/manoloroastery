import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { mensajeError } from '../../../lib/errores'
import { suscribirCambios } from '../../../lib/realtime'
import { actualizarCliente, crearCliente, eliminarCliente, listarClientes } from '../services/clientesService'
import type { Cliente, ClienteDatos } from '../types'

interface ClientesValue {
  clientes: Cliente[]
  cargando: boolean
  error: string | null
  recargar: () => Promise<void>
  crear: (datos: ClienteDatos) => Promise<Cliente>
  actualizar: (id: string, datos: ClienteDatos) => Promise<Cliente>
  eliminar: (id: string) => Promise<void>
}

const ClientesContext = createContext<ClientesValue | null>(null)

export function ClientesProvider({ children }: { children: ReactNode }) {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const recargar = useCallback(async () => {
    try {
      setClientes(await listarClientes())
      setError(null)
    } catch (e) {
      setError(mensajeError(e))
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    void recargar()
    return suscribirCambios('clientes', recargar)
  }, [recargar])

  const crear = useCallback(async (datos: ClienteDatos) => {
    const c = await crearCliente(datos)
    await recargar()
    return c
  }, [recargar])

  const actualizar = useCallback(async (id: string, datos: ClienteDatos) => {
    const c = await actualizarCliente(id, datos)
    await recargar()
    return c
  }, [recargar])

  const eliminar = useCallback(async (id: string) => {
    await eliminarCliente(id)
    await recargar()
  }, [recargar])

  return (
    <ClientesContext.Provider value={{ clientes, cargando, error, recargar, crear, actualizar, eliminar }}>
      {children}
    </ClientesContext.Provider>
  )
}

export function useClientes() {
  const ctx = useContext(ClientesContext)
  if (!ctx) throw new Error('useClientes debe usarse dentro de <ClientesProvider>')
  return ctx
}
