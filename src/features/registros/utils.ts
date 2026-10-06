import { dec, money } from '../../lib/format'
import type { Precios } from '../configuracion/types'
import type { CantidadBolsas, Cobro, Registro } from './types'

export const BOLSAS = [
  { n: 'n340', p: 'p340', label: '340 g' },
  { n: 'n500', p: 'p500', label: '500 g' },
  { n: 'n2500', p: 'p2500', label: '2.500 g' },
] as const

/** Cobro: gramos ÷ 500 = libras × precio por libra, más las bolsas. */
export function calcularCobro(r: CantidadBolsas & { gramos: number }, precios: Precios): Cobro {
  const g = r.gramos > 0 ? r.gramos : 0
  const libras = g / 500
  const tostion = libras * precios.lb
  const nb = r.n340 + r.n500 + r.n2500
  const bolsas = r.n340 * precios.p340 + r.n500 * precios.p500 + r.n2500 * precios.p2500
  const total = tostion + bolsas
  return {
    libras, tostion, bolsas, total, nb,
    librasTxt: dec(libras, 2) + ' lb',
    tostionTxt: money(tostion),
    bolsasTxt: money(bolsas),
    totalTxt: money(total),
    fLibras: dec(g, 0) + ' g ÷ 500',
    fTostion: dec(libras, 2) + ' lb × ' + money(precios.lb),
    fBolsas: nb + (nb === 1 ? ' bolsa' : ' bolsas'),
    fTotal: `${dec(g, 0)} g ÷ 500 = ${dec(libras, 2)} lb × ${money(precios.lb)} + bolsas ${money(bolsas)}`,
  }
}

/** "2 × 340 g · 1 × 2.500 g" */
export const describirBolsas = (r: CantidadBolsas) =>
  BOLSAS.filter((b) => r[b.n] > 0).map((b) => `${r[b.n]} × ${b.label}`).join(' · ') || 'Sin bolsas'

/** CSV de un registro, separado por ; para que Excel en español lo abra bien. */
export function registroACsv(r: Registro): string {
  const c = calcularCobro(r, r.precios)
  const filas = [
    ['Registro', 'Fecha', 'Cliente', 'Celular', 'Proceso', 'Kilos recibidos', 'Gramos tostados', 'Libras', 'Tostión',
      'Bolsas 340g', 'Bolsas 500g', 'Bolsas 2500g', 'Valor bolsas', 'Total', 'Forma de pago', 'Estado'],
    [r.codigo, r.fecha, r.cliente, r.celular, r.proceso, r.kilos, r.gramos, c.libras.toFixed(2), Math.round(c.tostion),
      r.n340, r.n500, r.n2500, Math.round(c.bolsas), Math.round(c.total), r.pago, r.estado],
  ]
  return '﻿' + filas.map((f) => f.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';')).join('\n')
}

/** Lo que se puede cambiar o borrar todavía. */
export const esEditable = (r: Registro) => r.estado === 'Pendiente' || r.estado === 'Error'
