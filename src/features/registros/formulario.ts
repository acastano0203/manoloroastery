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
  gramos: string
  n340: number
  n500: number
  n2500: number
}

export type CampoForm = 'cliente' | 'celular' | 'pago' | 'kilos' | 'gramos' | 'numDoc' | 'correo'
export type ErroresForm = Partial<Record<CampoForm, string>>

export const formVacio = (): FormRegistro => ({
  fecha: hoyISO(), clienteId: null, clienteNuevo: false, cliente: '', celular: '', factura: false, tipoDoc: 'CC',
  numDoc: '', correo: '', pago: null, proceso: 'Pergamino', kilos: '', gramos: '', n340: 0, n500: 0, n2500: 0,
})

export const formDesdeRegistro = (r: Registro): FormRegistro => ({
  fecha: r.fecha, clienteId: r.clienteId, clienteNuevo: false, cliente: r.cliente, celular: cel(r.celular).replace('+57 ', ''),
  factura: r.factura, tipoDoc: r.tipoDoc, numDoc: r.numDoc, correo: r.correo, pago: r.pago, proceso: r.proceso,
  kilos: kg(r.kilos), gramos: miles(r.gramos), n340: r.n340, n500: r.n500, n2500: r.n2500,
})

export function validarRegistro(s: FormRegistro): ErroresForm {
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
  const g = parseG(s.gramos)
  if (g === null) e.gramos = 'Escribe los gramos a tostar.'
  else if (isNaN(g) || g <= 0) e.gramos = 'Solo números mayores que 0.'
  if (s.factura) {
    if (!/^\d{5,12}(-\d)?$/.test(s.numDoc.replace(/[\s.]/g, ''))) e.numDoc = 'Número de documento no válido.'
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s.correo.trim())) e.correo = 'Correo no válido.'
  }
  return e
}
