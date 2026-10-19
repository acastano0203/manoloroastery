import { describe, expect, it } from 'vitest'
import type { Lectura } from './types'
import { lecturasCompletas, leerMmss, minutoFinal, mmss, resumenTiempos } from './utils'

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

  it('desarrollo y DTR salen del primer crack y la descarga', () => {
    // crack 8:00, descarga 10:00 → 2:00 de desarrollo, 20 % del total
    expect(resumenTiempos({ crackSeg: 480, descargaSeg: 600 })).toEqual({ total: 600, desarrollo: 120, dtr: 20 })
    expect(resumenTiempos({ crackSeg: null, descargaSeg: 600 }).desarrollo).toBeNull()
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
