import { supabase } from '../../../lib/supabase'
import type { Database } from '../../../types/database'
import type { Cliente, ClienteDatos } from '../types'

type Fila = Database['public']['Tables']['clientes']['Row']

const aCliente = (f: Fila): Cliente => ({
  id: f.id,
  codigo: f.codigo,
  nombre: f.nombre,
  celular: f.celular,
  factura: f.factura,
  tipoDoc: f.tipo_doc,
  numDoc: f.num_doc,
  correo: f.correo,
})

/** Limpia los datos: sin factura no se guardan documento ni correo. */
const aFila = (d: ClienteDatos) => ({
  nombre: d.nombre.trim(),
  celular: d.celular.replace(/\D/g, ''),
  factura: d.factura,
  tipo_doc: d.tipoDoc,
  num_doc: d.factura ? d.numDoc.replace(/[\s.]/g, '') : '',
  correo: d.factura ? d.correo.trim() : '',
})

export async function listarClientes(): Promise<Cliente[]> {
  const { data, error } = await supabase.from('clientes').select('*').order('nombre')
  if (error) throw error
  return data.map(aCliente)
}

export async function crearCliente(datos: ClienteDatos): Promise<Cliente> {
  const { data, error } = await supabase.from('clientes').insert(aFila(datos)).select().single()
  if (error) throw error
  return aCliente(data)
}

export async function actualizarCliente(id: string, datos: ClienteDatos): Promise<Cliente> {
  const { data, error } = await supabase.from('clientes').update(aFila(datos)).eq('id', id).select().single()
  if (error) throw error
  return aCliente(data)
}

export async function eliminarCliente(id: string): Promise<void> {
  const { error } = await supabase.from('clientes').delete().eq('id', id)
  if (error) throw error
}
