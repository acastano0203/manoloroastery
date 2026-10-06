import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { mensajeError } from '../../../lib/errores'
import { suscribirCambios } from '../../../lib/realtime'
import { enviarRegistroASiigo } from '../../configuracion/services/siigoService'
import { cambiarEstado, eliminarRegistro, listarRegistros, obtenerRegistro } from '../services/registrosService'
import type { Aviso, Registro } from '../types'

interface RegistrosValue {
  registros: Registro[]
  cargando: boolean
  error: string | null
  recargar: () => Promise<void>
  /** Aviso que se muestra arriba en Registros (guardado, enviado, eliminado…). */
  aviso: Aviso | null
  setAviso: (a: Aviso | null) => void
  enviar: (id: string) => Promise<void>
  eliminar: (r: Registro) => Promise<void>
}

const RegistrosContext = createContext<RegistrosValue | null>(null)

export function RegistrosProvider({ children }: { children: ReactNode }) {
  const [filas, setFilas] = useState<Registro[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<Aviso | null>(null)
  const [enCurso, setEnCurso] = useState<ReadonlySet<string>>(new Set())

  const recargar = useCallback(async () => {
    try {
      setFilas(await listarRegistros())
      setError(null)
    } catch (e) {
      setError(mensajeError(e))
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    void recargar()
    return suscribirCambios('registros', recargar)
  }, [recargar])

  const enviar = useCallback(async (id: string) => {
    setEnCurso((s) => new Set(s).add(id))
    setAviso(null)
    let cliente = ''
    try {
      await cambiarEstado(id, 'Enviando')
      await recargar()
      const r = await obtenerRegistro(id)
      cliente = r.cliente
      await enviarRegistroASiigo(r)
      await cambiarEstado(id, 'Enviado')
      setAviso({ kind: 'ok', text: `${r.cliente} enviado. La remisión está lista.`, registroId: id })
    } catch (e) {
      await cambiarEstado(id, 'Error').catch(() => undefined)
      setAviso({ kind: 'error', text: `${cliente ? cliente + ': ' : ''}no se pudo enviar. ${mensajeError(e)}` })
    } finally {
      setEnCurso((s) => {
        const n = new Set(s)
        n.delete(id)
        return n
      })
      await recargar()
    }
  }, [recargar])

  const eliminar = useCallback(async (r: Registro) => {
    try {
      await eliminarRegistro(r.id)
      setAviso({ kind: 'neutral', text: `Registro de ${r.cliente} eliminado.` })
    } catch (e) {
      setAviso({ kind: 'error', text: mensajeError(e) })
    }
    await recargar()
  }, [recargar])

  // Un "Enviando" que no se está enviando en esta pestaña quedó a medias (se cerró la app): se muestra como pendiente.
  const registros = useMemo(
    () => filas.map((r) => (r.estado === 'Enviando' && !enCurso.has(r.id) ? { ...r, estado: 'Pendiente' as const } : r)),
    [filas, enCurso],
  )

  return (
    <RegistrosContext.Provider value={{ registros, cargando, error, recargar, aviso, setAviso, enviar, eliminar }}>
      {children}
    </RegistrosContext.Provider>
  )
}

export function useRegistros() {
  const ctx = useContext(RegistrosContext)
  if (!ctx) throw new Error('useRegistros debe usarse dentro de <RegistrosProvider>')
  return ctx
}
