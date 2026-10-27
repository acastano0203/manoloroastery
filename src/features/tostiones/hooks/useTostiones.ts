import { useCallback, useEffect, useState } from 'react'
import { mensajeError } from '../../../lib/errores'
import { suscribirCambios } from '../../../lib/realtime'
import { eliminarTostion, listarTostiones } from '../services/tostionesService'
import type { Tostion } from '../types'

/** Tostiones de un lote, al día con lo que se registra en otros dispositivos. */
export function useTostiones(loteId: string) {
  const [tostiones, setTostiones] = useState<Tostion[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const recargar = useCallback(async () => {
    try {
      setTostiones(await listarTostiones(loteId))
      setError(null)
    } catch (e) {
      setError(mensajeError(e))
    } finally {
      setCargando(false)
    }
  }, [loteId])

  useEffect(() => {
    void recargar()
    const fin1 = suscribirCambios('tostiones', recargar)
    const fin2 = suscribirCambios('tostion_lecturas', recargar)
    return () => { fin1(); fin2() }
  }, [recargar])

  /** Corre una acción contra la base y recarga; si falla, deja el mensaje en `error`. */
  const ejecutar = useCallback(async (accion: () => Promise<void>) => {
    try {
      await accion()
      setError(null)
    } catch (e) {
      setError(mensajeError(e))
    }
    await recargar()
  }, [recargar])

  /** Quita la tostión (y su botón de bache) de una vez y la borra en la base; si falla, vuelve a aparecer al recargar. */
  const eliminar = useCallback(async (t: Pick<Tostion, 'id' | 'archivo'>) => {
    setTostiones((ts) => ts.filter((x) => x.id !== t.id))
    await ejecutar(() => eliminarTostion(t))
  }, [ejecutar])

  return { tostiones, cargando, error, ejecutar, eliminar }
}

export type TostionesApi = ReturnType<typeof useTostiones>
