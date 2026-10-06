import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { mensajeError } from '../../../lib/errores'
import { suscribirCambios } from '../../../lib/realtime'
import { guardarConfiguracion, obtenerConfiguracion } from '../services/configService'
import type { Configuracion } from '../types'

interface ConfigValue {
  config: Configuracion | null
  error: string | null
  guardar: (c: Configuracion) => Promise<void>
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

  const guardar = useCallback(async (c: Configuracion) => {
    await guardarConfiguracion(c)
    setConfig(c)
  }, [])

  return <ConfigContext.Provider value={{ config, error, guardar }}>{children}</ConfigContext.Provider>
}

export function useConfig() {
  const ctx = useContext(ConfigContext)
  if (!ctx) throw new Error('useConfig debe usarse dentro de <ConfigProvider>')
  return ctx
}
