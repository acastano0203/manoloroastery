import { useMemo, useState } from 'react'
import { hoyISO } from '../../../lib/format'
import { agruparPorDia, filtrarHistorial, paginar, resumirHistorial, type Rango } from '../historial'
import { useRegistros } from './useRegistros'

/** Historial: filtros, totales de lo filtrado y la página actual agrupada por día. */
export function useHistorial() {
  const { registros } = useRegistros()
  const [rango, setRangoEstado] = useState<Rango>('30')
  const [q, setQEstado] = useState('')
  const [pagina, setPagina] = useState(1)

  const lista = useMemo(() => filtrarHistorial(registros, rango, q, hoyISO()), [registros, rango, q])
  const resumen = useMemo(() => resumirHistorial(lista), [lista])
  const pag = paginar(lista, pagina)
  const grupos = useMemo(() => agruparPorDia(pag.items), [pag.items])

  // Al cambiar un filtro se vuelve a la primera página.
  const setRango = (r: Rango) => { setRangoEstado(r); setPagina(1) }
  const setQ = (v: string) => { setQEstado(v); setPagina(1) }

  const hayEnviados = registros.some((r) => r.etapa === 'Entregado' && r.estado === 'Enviado')
  const vacioTxt = hayEnviados ? 'No hay lotes con estos filtros.' : 'Aún no hay lotes entregados y enviados.'
  return { rango, setRango, q, setQ, resumen, grupos, pag, setPagina, vacioTxt }
}
