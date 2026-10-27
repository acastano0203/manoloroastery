import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { mensajeError } from '../../../lib/errores'
import { suscribirCambios } from '../../../lib/realtime'
import { ajustarInventario, guardarConfiguracion, obtenerConfiguracion } from '../services/configService'
import type { Configuracion, Inventario } from '../types'

interface ConfigValue {
  config: Configuracion | null
  error: string | null
  /** Guarda precios y Siigo; con cambios de inventario, también fija esas cantidades. */
  guardar: (c: Configuracion, inventario?: Partial<Inventario>) => Promise<void>
}

const ConfigContext = createContext<ConfigValue | null>(null)

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<Configuracion | null>(null)
  const [error, setError] = useState<string | null>(null)

  const recargar = useCallback(async () => {
    try {
      setConfig(await obtenerConfiguracion())
      setError(null)
    } catch (e) {
      setError(mensajeError(e))
    }
  }, [])

  useEffect(() => {
    void recargar()
    return suscribirCambios('configuracion', recargar)
  }, [recargar])

  const guardar = useCallback(async (c: Configuracion, inventario: Partial<Inventario> = {}) => {
    await guardarConfiguracion(c)
    await ajustarInventario(c.id, inventario)
    // El inventario se vuelve a leer: la base pudo descontar bolsas mientras tanto.
    setConfig({ ...c, inventario: { ...c.inventario, ...inventario } })
    void recargar()
  }, [recargar])

  return <ConfigContext.Provider value={{ config, error, guardar }}>{children}</ConfigContext.Provider>
}

/** Igual que useConfig, pero sin fallar fuera de <ConfigProvider> (para componentes que solo muestran datos). */
export const useConfigOpcional = () => useContext(ConfigContext)

export function useConfig() {
  const ctx = useContext(ConfigContext)
  if (!ctx) throw new Error('useConfig debe usarse dentro de <ConfigProvider>')
  return ctx
}
