import { useMemo, useState } from 'react'
import { hoyISO, norm } from '../../../lib/format'
import { useRegistros } from './useRegistros'

export type Rango = 'hoy' | 'ayer' | 'semana' | 'todo'
export const RANGOS: ReadonlyArray<[Rango, string]> = [['hoy', 'Hoy'], ['ayer', 'Ayer'], ['semana', '7 días'], ['todo', 'Todo']]

/** Registros ya enviados, filtrados por fecha y nombre de cliente. */
export function useHistorial() {
  const { registros } = useRegistros()
  const [rango, setRango] = useState<Rango>('semana')
  const [q, setQ] = useState('')

  const enviados = useMemo(() => registros.filter((r) => r.estado === 'Enviado'), [registros])

  const lista = useMemo(() => {
    const ayer = hoyISO(-1)
    const desde: Record<Rango, string> = { hoy: hoyISO(), ayer, semana: hoyISO(-6), todo: '0000' }
    const nq = norm(q.trim())
    return enviados.filter((r) => {
      if (rango === 'ayer' ? r.fecha !== ayer : r.fecha < desde[rango]) return false
      return !nq || norm(r.cliente).includes(nq)
    })
  }, [enviados, rango, q])

  const vacioTxt = enviados.length ? 'No hay registros con estos filtros.' : 'Aún no hay registros enviados.'
  return { lista, rango, setRango, q, setQ, vacioTxt }
}
