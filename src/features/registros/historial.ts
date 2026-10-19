import { norm } from '../../lib/format'
import type { Registro } from './types'
import { calcularCobro } from './utils'

export type Rango = 'hoy' | '7' | '30' | 'todo'
export const RANGOS: ReadonlyArray<[Rango, string]> = [['hoy', 'Hoy'], ['7', '7 días'], ['30', '30 días'], ['todo', 'Todo']]
export const POR_PAGINA = 10

/** "YYYY-MM-DD" de hace n días respecto a `hoy`. */
function haceDias(hoy: string, n: number) {
  const d = new Date(`${hoy}T12:00:00`)
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

/** Entregados y enviados a contabilidad, del más nuevo al más viejo, filtrados por fecha y por cliente o código. */
export function filtrarHistorial(registros: Registro[], rango: Rango, q: string, hoy: string): Registro[] {
  const desde = rango === 'todo' ? '0000' : rango === 'hoy' ? hoy : haceDias(hoy, Number(rango) - 1)
  const nq = norm(q.trim())
  return registros
    .filter((r) => r.etapa === 'Entregado' && r.estado === 'Enviado' && r.fecha >= desde)
    .filter((r) => !nq || norm(r.cliente).includes(nq) || norm(r.codigo).includes(nq))
    .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.codigo.localeCompare(a.codigo))
}

/** Totales de lo filtrado (todas las páginas). */
export function resumirHistorial(lista: Registro[]) {
  return lista.reduce((s, r) => {
    const c = calcularCobro(r, r.precios)
    return { lotes: s.lotes + 1, libras: s.libras + c.libras, total: s.total + c.total }
  }, { lotes: 0, libras: 0, total: 0 })
}

/** La página pedida (desde 1), ajustada si quedó fuera de rango al filtrar. */
export function paginar<T>(lista: T[], pagina: number, porPagina = POR_PAGINA) {
  const paginas = Math.max(1, Math.ceil(lista.length / porPagina))
  const actual = Math.min(Math.max(1, pagina), paginas)
  const desde = (actual - 1) * porPagina
  return { items: lista.slice(desde, desde + porPagina), pagina: actual, paginas, desde: desde + 1, hasta: Math.min(desde + porPagina, lista.length) }
}

/** Agrupa por fecha conservando el orden: [['2026-10-19', [...]], ...]. */
export function agruparPorDia(lista: Registro[]): Array<[string, Registro[]]> {
  const grupos: Array<[string, Registro[]]> = []
  for (const r of lista) {
    const ultimo = grupos[grupos.length - 1]
    if (ultimo && ultimo[0] === r.fecha) ultimo[1].push(r)
    else grupos.push([r.fecha, [r]])
  }
  return grupos
}
