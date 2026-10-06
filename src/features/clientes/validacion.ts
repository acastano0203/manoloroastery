import { norm } from '../../lib/format'
import type { Cliente, ClienteDatos } from './types'

export type ErroresCliente = Partial<Record<'nombre' | 'celular', string>>

export const clienteVacio = (): ClienteDatos => ({ nombre: '', celular: '', factura: false, tipoDoc: 'CC', numDoc: '', correo: '' })

export function validarCliente(d: ClienteDatos, clientes: Cliente[], idEditando: string | null): ErroresCliente {
  const e: ErroresCliente = {}
  if (!d.nombre.trim()) e.nombre = 'Escribe el nombre.'
  else if (clientes.some((k) => k.id !== idEditando && norm(k.nombre) === norm(d.nombre.trim()))) {
    e.nombre = 'Ya existe un cliente con ese nombre.'
  }
  if (!/^3\d{9}$/.test(d.celular.replace(/\D/g, ''))) e.celular = 'Debe tener 10 dígitos y empezar por 3.'
  return e
}
