import { describe, expect, it } from 'vitest'
import type { Lectura } from './types'
import { fasesTostion, lecturasCompletas, leerMmss, minutoFinal, mmss } from './utils'

const l = (segundo: number, p: Partial<Lectura> = {}): Lectura =>
  ({ id: String(segundo), segundo, tempGrano: null, tempTambor: null, aire: null, llama: null, ...p })

describe('tiempos de la tostión', () => {
  it('mm:ss de ida y vuelta', () => {
    expect(mmss(125)).toBe('2:05')
    expect(leerMmss('2:05')).toBe(125)
    expect(leerMmss('9')).toBe(540)
    expect(leerMmss('')).toBeNull()
    expect(leerMmss('2:75')).toBeNaN()
  })

  it('las tres fases salen del fin de secado, el crack y el fin de curva, como % del total', () => {
    // secado 4:00, crack 8:00, fin 10:00 → 40 % secado, 40 % Maillard, 20 % desarrollo
    expect(fasesTostion({ secadoSeg: 240, crackSeg: 480, descargaSeg: 600 })).toEqual({
      total: 600,
      secado: { seg: 240, pct: 40 },
      maillard: { seg: 240, pct: 40 },
      desarrollo: { seg: 120, pct: 20 },
    })
    // Sin fin de secado: no hay secado ni Maillard, pero sí desarrollo
    const sinSecado = fasesTostion({ secadoSeg: null, crackSeg: 480, descargaSeg: 600 })
    expect(sinSecado.secado.pct).toBeNull()
    expect(sinSecado.maillard.pct).toBeNull()
    expect(sinSecado.desarrollo.pct).toBe(20)
    // Sin terminar la curva hay duraciones, pero todavía no porcentajes
    expect(fasesTostion({ secadoSeg: 240, crackSeg: 480, descargaSeg: null }).maillard).toEqual({ seg: 240, pct: null })
  })
})

describe('lecturas', () => {
  it('aire y llama siguen como estaban si no se cambian', () => {
    const r = lecturasCompletas({
      aireInicial: 25, llamaInicial: 100,
      lecturas: [l(120, { llama: 30 }), l(0), l(480, { aire: 75 }), l(300)],
    })
    expect(r.map((x) => [x.segundo / 60, x.aire, x.llama])).toEqual([[0, 25, 100], [2, 25, 30], [5, 25, 30], [8, 75, 30]])
  })

  it('la curva llega al minuto 12, o más si hay datos después', () => {
    expect(minutoFinal({ lecturas: [l(300)], descargaSeg: null })).toBe(12)
    expect(minutoFinal({ lecturas: [l(840)], descargaSeg: 870 })).toBe(15)
  })
})
