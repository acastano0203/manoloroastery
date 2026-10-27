import { describe, expect, it } from 'vitest'
import type { Registro } from '../types'
import { construirReporteLote } from './reportePdf'

const base = {
  id: 'x', codigo: 'L-0007', clienteId: 'c', fecha: '2026-10-19', cliente: 'Ana', celular: '3001234567', factura: false, tipoDoc: 'CC',
  numDoc: '', correo: '', pago: 'Efectivo', proceso: 'Pergamino', kilos: 20, humedad: 11.5, densidad: 700, gramos: 16000,
  n340: 2, n500: 0, n2500: 0, nDrip: 3, bolsasCliente: false, gramosTostado: 13600, estado: 'Pendiente', etapa: 'Entregado',
  llegada: 'Pergamino', precios: { lb: 3000, p340: 1500, p500: 1800, p2500: 4000, pDrip: 2500 },
  entregadoAt: '2026-10-21T15:00:00', reabiertoAt: null,
  almacenamiento: { dias: 5, gramos: 3000, unidad: 'kg', marcado: 'Bolsa kraft', foto: 'x.jpg' },
} as Registro

const texto = (r: Registro) => new TextDecoder('latin1').decode(construirReporteLote(r))

describe('reporte del lote en PDF', () => {
  it('trae los datos de cada etapa por la que pasó, en kilos, y el cobro', () => {
    const t = texto(base)
    expect(t.startsWith('%PDF')).toBe(true)
    for (const s of ['REPORTE DE LOTE', 'L-0007', 'Recibido', '20 kg', '16 kg', '13,6 kg', '20,0 %', '15,0 %', '2 × 340 g · 3 × drip',
      'Entregado', 'Bolsa kraft', 'Total']) {
      expect(t).toContain(s)
    }
  })

  it('en Recibido no muestra las etapas siguientes ni el cobro', () => {
    const t = texto({ ...base, etapa: 'Recibido', gramos: null, gramosTostado: null, almacenamiento: null, entregadoAt: null })
    expect(t).toContain('BOLSAS Y DRIPS PEDIDOS')
    expect(t).not.toContain('Trillado y tostado')
    expect(t).not.toContain('Total')
    expect(t).toContain('El cobro se estima al tostar')
  })
})
