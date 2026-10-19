import { cel, hoyISO, kg, miles, parseG, parseKg } from '../../lib/format'
import type { TipoDoc } from '../clientes/types'
import type { Pago, Proceso, Registro } from './types'

/** Estado del formulario: los números se guardan como texto tal cual se escriben. */
export interface FormRegistro {
  fecha: string
  clienteId: string | null
  clienteNuevo: boolean
  cliente: string
  celular: string
  factura: boolean
  tipoDoc: TipoDoc
  numDoc: string
  correo: string
  pago: Pago | null
  proceso: Proceso
  kilos: string
  /** Opcional. */
  humedad: string
  /** Opcional, en g/L. */
  densidad: string
  gramos: string
  n340: number
  n500: number
  n2500: number
  nDrip: number
  bolsasCliente: boolean
  /** Peso del café tostado (g). */
  gramosTostado: string
}

export type CampoForm = 'cliente' | 'celular' | 'pago' | 'kilos' | 'humedad' | 'densidad' | 'gramos' | 'gramosTostado' | 'numDoc' | 'correo'
export type ErroresForm = Partial<Record<CampoForm, string>>

export const formVacio = (): FormRegistro => ({
  fecha: hoyISO(), clienteId: null, clienteNuevo: false, cliente: '', celular: '', factura: false, tipoDoc: 'CC',
  numDoc: '', correo: '', pago: null, proceso: 'Pergamino', kilos: '', humedad: '', densidad: '', gramos: '', n340: 0, n500: 0, n2500: 0, nDrip: 0,
  bolsasCliente: false, gramosTostado: '',
})

export const formDesdeRegistro = (r: Registro): FormRegistro => ({
  fecha: r.fecha, clienteId: r.clienteId, clienteNuevo: false, cliente: r.cliente, celular: cel(r.celular).replace('+57 ', ''),
  factura: r.factura, tipoDoc: r.tipoDoc, numDoc: r.numDoc, correo: r.correo, pago: r.pago, proceso: r.proceso,
  kilos: kg(r.kilos), humedad: r.humedad === null ? '' : kg(r.humedad),
  densidad: r.densidad === null ? '' : kg(r.densidad), gramos: r.gramos === null ? '' : miles(r.gramos), n340: r.n340, n500: r.n500, n2500: r.n2500,
  nDrip: r.nDrip, bolsasCliente: r.bolsasCliente, gramosTostado: r.gramosTostado === null ? '' : miles(r.gramosTostado),
})

/** Error del café a tostar (en gramos), o undefined si está bien. */
export function validarGramos(texto: string): string | undefined {
  const g = parseG(texto)
  if (g === null) return 'Escribe el peso en almendra.'
  if (isNaN(g) || g <= 0) return 'Solo números mayores que 0.'
  return undefined
}

/** Error del peso del café tostado, o undefined si está bien. No puede pesar más que el café en almendra. */
export function validarTostado(texto: string, gramosAlmendra: number | null, obligatorio: boolean): string | undefined {
  const t = parseG(texto)
  if (t === null) return obligatorio ? 'Pesa el café tostado y escribe los gramos.' : undefined
  if (isNaN(t) || t <= 0) return 'Solo números mayores que 0.'
  if (gramosAlmendra && t > gramosAlmendra) return `No puede pesar más que el café en almendra (${miles(gramosAlmendra)} g).`
  return undefined
}

/**
 * pideGramos: el café a tostar solo se pide si el lote ya se tostó.
 * pideEmpaque: el peso tostado se revisa si el lote ya se empacó (no es obligatorio: los lotes viejos no lo tienen).
 */
export function validarRegistro(s: FormRegistro, pideGramos = false, pideEmpaque = false): ErroresForm {
  const e: ErroresForm = {}
  if (!s.clienteId && !s.clienteNuevo) e.cliente = 'Elige un cliente o crea uno nuevo.'
  else if (!s.cliente.trim()) e.cliente = 'Escribe el nombre del cliente.'
  const celular = s.celular.replace(/\D/g, '')
  if (!celular) e.celular = 'Escribe el celular para enviar la remisión.'
  else if (!/^3\d{9}$/.test(celular)) e.celular = 'Debe tener 10 dígitos y empezar por 3.'
  if (!s.pago) e.pago = 'Elige una forma de pago.'
  const k = parseKg(s.kilos)
  if (k === null) e.kilos = 'Escribe los kilos recibidos.'
  else if (isNaN(k) || k <= 0) e.kilos = 'Solo números mayores que 0. Ej: 12,5'
  const h = parseKg(s.humedad)
  if (h !== null && (isNaN(h) || h < 0 || h > 100)) e.humedad = 'Escribe un porcentaje entre 0 y 100. Ej: 11,5'
  const d = parseKg(s.densidad)
  if (d !== null && (isNaN(d) || d <= 0 || d >= 2000)) e.densidad = 'Escribe la densidad en gramos por litro. Ej: 700'
  const errorGramos = pideGramos ? validarGramos(s.gramos) : undefined
  if (errorGramos) e.gramos = errorGramos
  const g = parseG(s.gramos)
  const errorTostado = pideEmpaque ? validarTostado(s.gramosTostado, g && g > 0 ? g : null, false) : undefined
  if (errorTostado) e.gramosTostado = errorTostado
  if (s.factura) {
    if (!/^\d{5,12}(-\d)?$/.test(s.numDoc.replace(/[\s.]/g, ''))) e.numDoc = 'Número de documento no válido.'
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s.correo.trim())) e.correo = 'Correo no válido.'
  }
  return e
}
