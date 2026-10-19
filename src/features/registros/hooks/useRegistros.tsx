import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { mensajeError } from '../../../lib/errores'
import { suscribirCambios } from '../../../lib/realtime'
import { enviarRegistroASiigo } from '../../configuracion/services/siigoService'
import { etapaAnterior, siguienteEtapa } from '../etapas'
import { cambiarEstado, cambiarEtapa, eliminarRegistro, listarRegistros, obtenerRegistro, reabrirRegistro, type DatosPaso } from '../services/registrosService'
import type { Aviso, Etapa, Registro } from '../types'

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
  /** Pasa el lote a la etapa siguiente (con "Deshacer" en el aviso), guardando lo que se anota en ese paso. */
  avanzar: (r: Registro, datos?: DatosPaso) => Promise<void>
  /** Devuelve el lote a la etapa anterior. */
  regresar: (r: Registro) => Promise<void>
  /** Reabre un lote enviado para modificarlo: queda en Entregado, pendiente de enviar otra vez. */
  reabrir: (r: Registro) => Promise<void>
  /** Pone el lote en una etapa (lo usa "Deshacer"). */
  moverA: (id: string, etapa: Etapa, datos?: DatosPaso) => Promise<void>
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
    return suscribirCambios('lotes', recargar)
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

  const moverA = useCallback(async (id: string, etapa: Etapa, datos?: DatosPaso) => {
    setAviso(null)
    try {
      await cambiarEtapa(id, etapa, datos)
    } catch (e) {
      setAviso({ kind: 'error', text: mensajeError(e) })
    }
    await recargar()
  }, [recargar])

  const avanzar = useCallback(async (r: Registro, datos?: DatosPaso) => {
    const etapa = siguienteEtapa(r)
    if (!etapa) return
    await moverA(r.id, etapa, datos)
    setAviso((a) => a ?? { kind: 'ok', text: `${r.cliente} (${r.codigo}) pasó a ${etapa}.`, deshacer: { id: r.id, etapa: r.etapa } })
  }, [moverA])

  const regresar = useCallback(async (r: Registro) => {
    const etapa = etapaAnterior(r)
    if (!etapa) return
    await moverA(r.id, etapa)
    setAviso((a) => a ?? { kind: 'neutral', text: `${r.cliente} (${r.codigo}) volvió a ${etapa}.`, deshacer: { id: r.id, etapa: r.etapa } })
  }, [moverA])

  const reabrir = useCallback(async (r: Registro) => {
    setAviso(null)
    try {
      await reabrirRegistro(r.id)
      setAviso({ kind: 'ok', text: `${r.cliente} (${r.codigo}) reabierto: está en Entregado, pendiente de enviar otra vez.` })
    } catch (e) {
      setAviso({ kind: 'error', text: mensajeError(e) })
    }
    await recargar()
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
    <RegistrosContext.Provider value={{ registros, cargando, error, recargar, aviso, setAviso, enviar, eliminar, avanzar, regresar, reabrir, moverA }}>
      {children}
    </RegistrosContext.Provider>
  )
}

export function useRegistros() {
  const ctx = useContext(RegistrosContext)
  if (!ctx) throw new Error('useRegistros debe usarse dentro de <RegistrosProvider>')
  return ctx
}
