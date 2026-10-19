import { describe, expect, it } from 'vitest'
import { agruparPorDia, filtrarHistorial, paginar, resumirHistorial } from './historial'
import type { Registro } from './types'

let n = 0
const lote = (p: Partial<Registro>) => ({
  id: String(++n), codigo: `L-${String(n).padStart(4, '0')}`, cliente: 'Ana', fecha: '2026-10-19', etapa: 'Entregado', estado: 'Enviado',
  gramos: 1000, n340: 0, n500: 0, n2500: 0, nDrip: 0, precios: { lb: 3000, p340: 0, p500: 0, p2500: 0, pDrip: 0 }, ...p,
}) as Registro

const HOY = '2026-10-19'

describe('historial', () => {
  it('solo entregados y enviados, del más nuevo al más viejo', () => {
    const lista = filtrarHistorial([
      lote({ fecha: '2026-10-10' }), lote({ fecha: '2026-10-18' }),
      lote({ estado: 'Pendiente' }), lote({ etapa: 'Empacado' }),
    ], 'todo', '', HOY)
    expect(lista.map((r) => r.fecha)).toEqual(['2026-10-18', '2026-10-10'])
  })

  it('filtra por fecha y por cliente o código', () => {
    const regs = [lote({ fecha: HOY, cliente: 'Andrea Orozco' }), lote({ fecha: '2026-10-13', cliente: 'Beto' }), lote({ fecha: '2026-09-01' })]
    expect(filtrarHistorial(regs, 'hoy', '', HOY)).toHaveLength(1)
    expect(filtrarHistorial(regs, '7', '', HOY)).toHaveLength(2) // del 13 al 19
    expect(filtrarHistorial(regs, '30', '', HOY)).toHaveLength(2)
    expect(filtrarHistorial(regs, 'todo', 'orozco', HOY).map((r) => r.cliente)).toEqual(['Andrea Orozco'])
    expect(filtrarHistorial(regs, 'todo', regs[1].codigo.toLowerCase(), HOY).map((r) => r.cliente)).toEqual(['Beto'])
  })

  it('pagina de a 10 y corrige una página fuera de rango', () => {
    const lista = Array.from({ length: 23 }, (_, i) => i)
    expect(paginar(lista, 1)).toMatchObject({ pagina: 1, paginas: 3, desde: 1, hasta: 10 })
    expect(paginar(lista, 3)).toMatchObject({ items: [20, 21, 22], desde: 21, hasta: 23 })
    expect(paginar(lista, 9).pagina).toBe(3)
    expect(paginar([], 1)).toMatchObject({ pagina: 1, paginas: 1, items: [] })
  })

  it('totales de lo filtrado y grupos por día', () => {
    const lista = [lote({ fecha: HOY, gramos: 1000 }), lote({ fecha: HOY, gramos: 500 }), lote({ fecha: '2026-10-18', gramos: 500 })]
    expect(resumirHistorial(lista)).toEqual({ lotes: 3, libras: 4, total: 12000 })
    expect(agruparPorDia(lista).map(([d, l]) => [d, l.length])).toEqual([[HOY, 2], ['2026-10-18', 1]])
  })
})
