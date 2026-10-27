import { describe, expect, it } from 'vitest'
import type { Registro } from '../registros/types'
import {
  agrupacionDe, atrasoPorTramo, duracion, inventarioPorEtapa, masAtrasados, pendiente, porPeriodo, porProceso, rangoDe,
  tiemposPorEtapa, topClientes, totales,
} from './reportes'
import { construirReporte } from './services/reportePdf'

let n = 0
const lote = (p: Partial<Registro>): Registro => ({
  id: `id-${++n}`, codigo: `L-${String(n).padStart(4, '0')}`, clienteId: 'c1', fecha: '2026-10-20', cliente: 'Ana',
  celular: '3001234567', factura: false, tipoDoc: 'CC', numDoc: '', correo: '', pago: null, proceso: 'Pergamino',
  kilos: 10, humedad: null, densidad: null, gramos: null, n340: 0, n500: 0, n2500: 0, nDrip: 0, bolsasCliente: false, gramosTostado: null,
  gramosSobrante: null, estado: 'Pendiente', etapa: 'Recibido', llegada: 'Pergamino',
  precios: { lb: 3000, p340: 1500, p500: 1800, p2500: 4000, pDrip: 2500 }, entregadoAt: null, reabiertoAt: null, almacenamiento: null,
  descripciones: {}, fechasEtapas: {}, presentacion: null, molienda: null, ...p,
})

const hoy = '2026-10-27'
const rango = { desde: '2026-10-01', hasta: hoy }

// Un lote en cada etapa:
const lotes = [
  lote({ etapa: 'Recibido', kilos: 20, fecha: '2026-10-25' }),                                        // pergamino por trillar
  lote({ etapa: 'Recibido', kilos: 5, llegada: 'Verde', proceso: 'En almendra (en verde)', fecha: '2026-10-12' }), // verde: ya en almendra
  lote({ etapa: 'Trillado', kilos: 15, fecha: '2026-10-20' }),
  lote({ etapa: 'Tostado', kilos: 12, gramos: 10000, fecha: '2026-10-18' }),
  lote({ etapa: 'Empacado', kilos: 10, gramos: 8000, gramosTostado: 6800, fecha: '2026-10-15', presentacion: 'Grano' }),
  lote({ etapa: 'Entregado', kilos: 10, gramos: 8000, gramosTostado: 6800, fecha: '2026-09-10', clienteId: 'c2', cliente: 'Beto' }), // fuera del período
]

describe('reportes: hoy en la tostaduría', () => {
  it('lo que falta por tostar: por trillar y ya en almendra', () => {
    const p = pendiente(lotes, hoy)
    expect(p).toMatchObject({
      lotes: 3, kg: 40,
      porTrillar: { lotes: 1, kg: 20 },
      enAlmendra: { lotes: 2, kg: 20 },
      masViejoDias: 15,
      porEmpacar: { lotes: 1, kg: 10 },
      porEntregar: { lotes: 1, kg: 6.8 },
    })
  })

  it('el café en proceso se reparte por etapa, sin los entregados', () => {
    expect(inventarioPorEtapa(lotes).map((x) => [x.nombre, x.valor])).toEqual([
      ['Recibido', 25], ['Trillado', 15], ['Tostado', 12], ['Empacado', 10],
    ])
  })

  it('atraso: lotes sin entregar según los días desde que se recibieron', () => {
    expect(atrasoPorTramo(lotes, hoy).map((x) => x.valor)).toEqual([1, 0, 2, 2, 0])
    const [primero] = masAtrasados(lotes, hoy)
    expect(primero).toMatchObject({ dias: 15, etapa: 'Recibido', diasEnEtapa: null })
  })
})

describe('reportes: el período', () => {
  it('totales de lo recibido en el período', () => {
    const t = totales(lotes, rango)
    expect(t.lotes).toBe(5)
    expect(t.recibidosKg).toBe(62)
    expect(t.trilladosKg).toBe(37) // trillado + tostado + empacado (el verde no se trilla)
    expect(t.almendraKg).toBe(18)
    expect(t.tostadoKg).toBe(6.8)
    expect(t.rendimientoPct).toBeCloseTo(68)
    // Tostado: 10 kg en almendra = 20 lb; empacado: 6,8 kg tostado = 13,6 lb (× $3.000)
    expect(t.cobro).toBe(60000 + 40800)
  })

  it('el período se agrupa por día, semana o mes según su largo', () => {
    expect(agrupacionDe({ desde: '2026-10-01', hasta: '2026-10-27' })).toBe('dia')
    expect(agrupacionDe({ desde: '2026-08-01', hasta: '2026-10-27' })).toBe('semana')
    expect(agrupacionDe({ desde: '2025-10-28', hasta: '2026-10-27' })).toBe('mes')
    expect(rangoDe('30', lotes, hoy)).toEqual({ desde: '2026-09-28', hasta: hoy })
    expect(rangoDe('todo', lotes, hoy).desde).toBe('2026-09-10')
  })

  it('recibido por fecha de recibo y tostado por el día en que se tostó', () => {
    const xs = [
      lote({ fecha: '2026-10-05', kilos: 8 }),
      lote({ fecha: '2026-10-05', kilos: 4, etapa: 'Tostado', gramos: 3000, fechasEtapas: { Tostado: '2026-10-07T15:00:00' } }),
    ]
    const { agrupacion, periodos } = porPeriodo(xs, rango)
    expect(agrupacion).toBe('dia')
    expect(periodos).toHaveLength(27)
    expect(periodos[4]).toMatchObject({ inicio: '2026-10-05', recibidoKg: 12, tostadoKg: 0, lotes: 2 })
    expect(periodos[6]).toMatchObject({ inicio: '2026-10-07', recibidoKg: 0, tostadoKg: 3 })
  })

  it('tiempo promedio de cada paso, con las horas de cada etapa', () => {
    const xs = [
      lote({ etapa: 'Tostado', fechasEtapas: { Recibido: '2026-10-20T08:00:00Z', Trillado: '2026-10-21T08:00:00Z', Tostado: '2026-10-21T14:00:00Z' } }),
      lote({ etapa: 'Trillado', fechasEtapas: { Recibido: '2026-10-20T08:00:00Z', Trillado: '2026-10-20T20:00:00Z' } }),
    ]
    const t = tiemposPorEtapa(xs, rango)
    expect(t.pasos.map((p) => p.valor)).toEqual([18, 6, 0, 0])
    expect(t.hastaTostarHoras).toBe(30)
    expect(duracion(18)).toBe('18 h')
    expect(duracion(30)).toBe('1,3 días')
  })

  it('procesos y clientes del período', () => {
    expect(porProceso(lotes, rango).map((x) => [x.nombre, x.valor])).toEqual([['Pergamino', 57], ['En almendra (en verde)', 5]])
    expect(topClientes(lotes, { desde: '2026-09-01', hasta: hoy })).toEqual([
      { clave: 'c1', nombre: 'Ana', valor: 62, detalle: '5 lotes' },
      { clave: 'c2', nombre: 'Beto', valor: 10, detalle: '1 lote' },
    ])
  })
})

describe('reporte en PDF', () => {
  it('arma un PDF de dos páginas con los datos', () => {
    const bytes = construirReporte({
      hoy, nombreRango: 'Últimos 30 días', rango, totales: totales(lotes, rango), pendiente: pendiente(lotes, hoy),
      inventario: inventarioPorEtapa(lotes), atraso: atrasoPorTramo(lotes, hoy), atrasados: masAtrasados(lotes, hoy),
      tiempos: tiemposPorEtapa(lotes, rango), periodo: porPeriodo(lotes, rango), procesos: porProceso(lotes, rango),
      presentacion: [], rendimiento: [], clientes: topClientes(lotes, rango),
    })
    const t = new TextDecoder('latin1').decode(bytes)
    expect(t.startsWith('%PDF-1.4')).toBe(true)
    expect(t).toContain('/Count 2')
    expect(t).toContain('(FALTA POR TOSTAR)')
    expect(t).toContain('Lotes m\xe1s atrasados')
    expect(t).toContain('Recibido vs. tostado')
  })
})
