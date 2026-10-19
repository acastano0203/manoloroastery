import { describe, expect, it } from 'vitest'
import type { Registro } from './types'
import { almacenHasta, registroACsv } from './utils'

const r = {
  codigo: 'L-0007', fecha: '2026-10-19', cliente: 'Ana', celular: '3001234567', proceso: 'Pergamino', kilos: 20, gramos: 16000,
  gramosTostado: 13600, llegada: 'Pergamino', n340: 0, n500: 0, n2500: 0, nDrip: 0, bolsasCliente: true, pago: null, estado: 'Pendiente',
  precios: { lb: 3000, p340: 1500, p500: 1800, p2500: 4000, pDrip: 2500 }, entregadoAt: '2026-10-19T15:00:00',
  almacenamiento: { dias: 5, gramos: 3000, unidad: 'kg', marcado: 'Bolsa kraft', foto: 'x.jpg' },
} as unknown as Registro

describe('exportación del lote', () => {
  it('incluye merma, pérdida en el tueste y almacenamiento', () => {
    const [encabezado, fila] = registroACsv(r).replace('﻿', '').split('\n').map((l) => l.split(';').map((c) => c.replace(/"/g, '')))
    const dato = (col: string) => fila[encabezado.indexOf(col)]
    expect(dato('Merma %')).toBe('20,0') // 20 kg → 16 kg
    expect(dato('Pérdida en el tueste %')).toBe('15,0') // 16.000 g → 13.600 g
    expect(dato('Almacenamiento')).toBe('Sí')
    expect(dato('Días almacenado')).toBe('5')
    expect(dato('Cantidad almacenada')).toBe('3 kg')
    expect(dato('Gramos almacenados')).toBe('3000')
    expect(dato('Cómo va marcado')).toBe('Bolsa kraft')
  })

  it('el almacenamiento vence el día de la entrega más los días acordados', () => {
    expect(almacenHasta(r)).toBe('2026-10-24')
    expect(almacenHasta({ ...r, almacenamiento: null })).toBeNull()
  })
})
