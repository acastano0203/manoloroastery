import { describe, expect, it } from 'vitest'
import { mensajeError } from '../../lib/errores'
import { calcularCobro, calcularPerdidaTueste, describirBolsas, calcularMerma, mermaAlta } from './utils'

const precios = { lb: 3000, p340: 1500, p500: 1800, p2500: 4000, pDrip: 2500 }

// Regla de cobro acordada: gramos ÷ 500 × precio por libra + bolsas. No cambiar sin confirmar.
describe('calcularCobro', () => {
  it('tostión = gramos ÷ 500 × precio por libra', () => {
    const c = calcularCobro({ gramos: 10000, n340: 0, n500: 0, n2500: 0, nDrip: 0 }, precios)
    expect(c.libras).toBe(20)
    expect(c.tostion).toBe(60000)
    expect(c.total).toBe(60000)
  })

  it('total = tostión + bolsas', () => {
    const c = calcularCobro({ gramos: 4250, n340: 2, n500: 1, n2500: 1, nDrip: 0 }, precios)
    expect(c.tostion).toBe(25500)
    expect(c.bolsas).toBe(2 * 1500 + 1800 + 4000)
    expect(c.total).toBe(25500 + 8800)
    expect(c.nb).toBe(4)
    expect(c.totalTxt).toBe('$ 34.300')
    expect(c.librasTxt).toBe('8,50 lb')
  })

  it('gramos vacíos o negativos no cobran tostión', () => {
    expect(calcularCobro({ gramos: -5, n340: 1, n500: 0, n2500: 0, nDrip: 0 }, precios).total).toBe(1500)
  })

  it('el total coincide con el pago que la migración creó para los registros viejos', () => {
    // Mismos casos que scripts/probar-migraciones.mjs
    expect(Math.round(calcularCobro({ gramos: 10000, n340: 2, n500: 0, n2500: 0, nDrip: 0 }, precios).total)).toBe(63000)
    expect(Math.round(calcularCobro({ gramos: 4250, n340: 0, n500: 0, n2500: 1, nDrip: 0 }, precios).total)).toBe(29500)
    expect(Math.round(calcularCobro({ gramos: 1001, n340: 0, n500: 0, n2500: 0, nDrip: 0 }, precios).total)).toBe(6006)
  })
})

describe('describirBolsas', () => {
  it('lista solo las bolsas usadas', () => {
    expect(describirBolsas({ n340: 2, n500: 0, n2500: 1, nDrip: 0 })).toBe('2 × 340 g · 1 × 2.500 g')
    expect(describirBolsas({ n340: 0, n500: 0, n2500: 0, nDrip: 0 })).toBe('Sin bolsas')
  })
})

describe('mensajeError', () => {
  it('lote con abonos', () => {
    expect(mensajeError({ code: '23001' })).toBe('Tiene abonos registrados, no se puede eliminar.')
  })
  it('lote ya enviado a contabilidad: muestra el mensaje de la base de datos', () => {
    const message = 'Este lote ya está en contabilidad. El cobro no se puede cambiar.'
    expect(mensajeError({ code: 'P0001', message })).toBe(message)
  })
})

describe('calcularMerma', () => {
  const base = { kilos: 12.5, gramos: 10000, llegada: 'Pergamino' as const }
  it('es lo que se perdió de los kilos recibidos al quedar en almendra', () => {
    expect(calcularMerma(base)).toBeCloseTo(20)
    expect(calcularMerma({ ...base, llegada: null })).toBeCloseTo(20)
  })
  it('no aplica si llegó en verde, si falta el peso o si no cuadra', () => {
    expect(calcularMerma({ ...base, llegada: 'Verde' })).toBeNull()
    expect(calcularMerma({ ...base, gramos: null })).toBeNull()
    expect(calcularMerma({ ...base, gramos: 13000 })).toBeNull()
  })
})

describe('mermaAlta', () => {
  it('avisa por encima del 20 %, o del 50 % en el natural', () => {
    expect(mermaAlta(20, 'Pergamino')).toBe(false)
    expect(mermaAlta(40, 'Honey')).toBe(true)
    expect(mermaAlta(40, 'Natural')).toBe(false)
    expect(mermaAlta(50, 'Natural')).toBe(false)
    expect(mermaAlta(55, 'Natural')).toBe(true)
    expect(mermaAlta(null, 'Pergamino')).toBe(false)
  })
})

describe('empaque', () => {
  it('los drips se cobran por unidad, junto con las bolsas', () => {
    const c = calcularCobro({ gramos: 1000, n340: 1, n500: 0, n2500: 0, nDrip: 4 }, precios)
    expect(c.bolsas).toBe(1500 + 4 * 2500)
    expect(c.total).toBe(6000 + 11500)
  })
  it('describe el empaque, con "sin bolsa" cuando el cliente trae las suyas', () => {
    expect(describirBolsas({ n340: 0, n500: 0, n2500: 0, nDrip: 5, bolsasCliente: true })).toBe('Sin bolsa (las trae el cliente) · 5 × drip')
    expect(describirBolsas({ n340: 0, n500: 0, n2500: 0, nDrip: 0, bolsasCliente: true })).toBe('Sin bolsa (las trae el cliente)')
  })
  it('pérdida en el tueste: de almendra a tostado', () => {
    expect(calcularPerdidaTueste({ gramos: 10000, gramosTostado: 8400 })).toBeCloseTo(16)
    expect(calcularPerdidaTueste({ gramos: 10000, gramosTostado: null })).toBeNull()
    expect(calcularPerdidaTueste({ gramos: 10000, gramosTostado: 12000 })).toBeNull()
  })
})
