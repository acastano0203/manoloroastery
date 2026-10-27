import { dec, kgDeG, money } from '../../lib/format'
import type { Precios } from '../configuracion/types'
import { pasaPorTrilla } from './etapas'
import { UNIDADES, type CantidadBolsas, type Cobro, type Proceso, type Registro, type Unidad } from './types'

/** Productos de empaque que se cobran por unidad. "bolsa": no se cobran si el cliente trae las suyas. */
export const BOLSAS = [
  { n: 'n340', p: 'p340', label: '340 g', nombre: 'Bolsa 340 g', plural: 'Bolsas 340 g', bolsa: true },
  { n: 'n500', p: 'p500', label: '500 g', nombre: 'Bolsa 500 g', plural: 'Bolsas 500 g', bolsa: true },
  { n: 'n2500', p: 'p2500', label: '2.500 g', nombre: 'Bolsa 2.500 g', plural: 'Bolsas 2.500 g', bolsa: true },
  { n: 'nDrip', p: 'pDrip', label: 'drip', nombre: 'Drip', plural: 'Drips', bolsa: false },
] as const

/**
 * Cobro: gramos ÷ 500 = libras × precio por libra, más bolsas y drips. Se muestra en kilos (1 kg = 2 lb).
 * Los gramos son los del café tostado, que se pesa al empacar. Antes de empacar se estima con el café en almendra.
 */
export function calcularCobro(r: CantidadBolsas & { gramos: number | null; gramosTostado?: number | null }, precios: Precios): Cobro {
  const base = r.gramosTostado && r.gramosTostado > 0 ? 'tostado' : 'almendra'
  const gBase = base === 'tostado' ? r.gramosTostado : r.gramos
  const g = gBase && gBase > 0 ? gBase : 0
  const libras = g / 500
  const tostion = libras * precios.lb
  const nb = BOLSAS.reduce((s, b) => s + r[b.n], 0)
  const bolsas = BOLSAS.reduce((s, b) => s + r[b.n] * precios[b.p], 0)
  const total = tostion + bolsas
  return {
    libras, tostion, bolsas, total, nb, base,
    librasTxt: dec(libras, 2) + ' lb',
    tostionTxt: money(tostion),
    bolsasTxt: money(bolsas),
    totalTxt: money(total),
    fLibras: `${kgDeG(g)} kg ${base === 'tostado' ? 'tostado' : 'en almendra'} × 2`,
    fTostion: dec(libras, 2) + ' lb × ' + money(precios.lb),
    fBolsas: nb + (nb === 1 ? ' unidad' : ' unidades'),
    fTotal: `${kgDeG(g)} kg ${base === 'tostado' ? 'tostado' : 'en almendra'} × 2 = ${dec(libras, 2)} lb × ${money(precios.lb)} + bolsas y drips ${money(bolsas)}`,
  }
}

/** Lo que se le quita al café al trillar: la cáscara en el natural, el pergamino en los demás. */
export const capaTrilla = (proceso: Proceso) => (proceso === 'Natural' ? 'cáscara' : 'pergamino')

/** Merma máxima esperada al trillar, en %. Por encima se avisa, pero no impide seguir. */
export const MERMA_MAXIMA = 20
/** El natural pierde más: se le quita la cáscara, no solo el pergamino. */
export const MERMA_MAXIMA_NATURAL = 50

export const mermaMaxima = (proceso: Proceso) => (proceso === 'Natural' ? MERMA_MAXIMA_NATURAL : MERMA_MAXIMA)

/**
 * Merma en %: lo que se perdió de los kilos recibidos al quedar en almendra (20 kg → 16 kg = 20 %).
 * null si el café llegó en verde (no se trilla) o si faltan datos o no cuadran.
 */
export function calcularMerma(r: Pick<Registro, 'kilos' | 'gramos' | 'llegada'>): number | null {
  const recibidos = r.kilos * 1000
  if (!pasaPorTrilla(r) || !r.gramos || r.gramos <= 0 || recibidos <= 0 || r.gramos > recibidos) return null
  return (1 - r.gramos / recibidos) * 100
}

/** Si la merma pasa del tope de su proceso (20 %, o 50 % en el natural). */
export const mermaAlta = (merma: number | null, proceso: Proceso) => merma !== null && merma > mermaMaxima(proceso)

/** "2 × 340 g · 5 × drip". Con bolsasCliente: "Sin bolsa (las trae el cliente)". */
export function describirBolsas(r: CantidadBolsas & { bolsasCliente?: boolean }) {
  const partes = BOLSAS.filter((b) => r[b.n] > 0).map((b) => `${r[b.n]} × ${b.label}`)
  if (r.bolsasCliente) partes.unshift('Sin bolsa (las trae el cliente)')
  return partes.join(' · ') || 'Sin bolsas'
}

/** Pérdida en el tueste en %: lo que perdió el café en almendra al tostarse. null si falta el peso tostado. */
export function calcularPerdidaTueste(r: Pick<Registro, 'gramos' | 'gramosTostado'>): number | null {
  if (!r.gramos || !r.gramosTostado || r.gramos <= 0 || r.gramosTostado > r.gramos) return null
  return (1 - r.gramosTostado / r.gramos) * 100
}

/** "20,0" (coma decimal, como lo lee Excel en español), o vacío si no hay dato. */
const porcentaje = (v: number | null) => (v === null ? '' : v.toFixed(1).replace('.', ','))

/** CSV de un registro, separado por ; para que Excel en español lo abra bien. */
export function registroACsv(r: Registro): string {
  const c = calcularCobro(r, r.precios)
  const filas = [
    ['Registro', 'Fecha', 'Cliente', 'Celular', 'Proceso', 'Kilos recibidos', 'Kilos en almendra', 'Libras', 'Tostión',
      'Sin bolsa', 'Bolsas 340g', 'Bolsas 500g', 'Bolsas 2500g', 'Drips', 'Valor empaque', 'Kilos tostado',
      'Merma %', 'Pérdida en el tueste %', 'Almacenamiento', 'Días almacenado', 'Kilos almacenados', 'Cómo va marcado',
      'Total', 'Forma de pago', 'Estado'],
    [r.codigo, r.fecha, r.cliente, r.celular, r.proceso, r.kilos, r.gramos === null ? '' : kgDeG(r.gramos), c.libras.toFixed(2), Math.round(c.tostion),
      r.bolsasCliente ? 'Sí' : 'No', r.n340, r.n500, r.n2500, r.nDrip, Math.round(c.bolsas), r.gramosTostado === null ? '' : kgDeG(r.gramosTostado),
      porcentaje(calcularMerma(r)), porcentaje(calcularPerdidaTueste(r)),
      r.almacenamiento ? 'Sí' : 'No', r.almacenamiento?.dias ?? '', r.almacenamiento ? kgDeG(r.almacenamiento.gramos) : '', r.almacenamiento?.marcado ?? '',
      Math.round(c.total), r.pago, r.estado],
  ]
  return '﻿' + filas.map((f) => f.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';')).join('\n')
}

const gramosPor = (u: Unidad) => UNIDADES.find((x) => x.u === u)!.gramos

/** Cantidad en esa unidad → gramos (redondeado). */
export const aGramos = (valor: number, u: Unidad) => Math.round(valor * gramosPor(u))

/** Gramos → cantidad en esa unidad, con hasta 2 decimales. */
export const desdeGramos = (gramos: number, u: Unidad) => Math.round((gramos / gramosPor(u)) * 100) / 100

/** Fecha límite del almacenamiento (YYYY-MM-DD): el día de la entrega más los días acordados. */
export function almacenHasta(r: Pick<Registro, 'entregadoAt' | 'almacenamiento'>): string | null {
  if (!r.almacenamiento || !r.entregadoAt) return null
  const d = new Date(r.entregadoAt)
  d.setDate(d.getDate() + r.almacenamiento.dias)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Lo que se puede cambiar o borrar todavía. */
export const esEditable = (r: Registro) => r.estado === 'Pendiente' || r.estado === 'Error'
