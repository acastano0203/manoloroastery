import { supabase } from '../../../lib/supabase'
import type { Database } from '../../../types/database'
import type { Precios } from '../../configuracion/types'
import type { Estado, Registro, RegistroDatos } from '../types'

type Fila = Database['public']['Tables']['lotes']['Row']

const aRegistro = (f: Fila): Registro => ({
  id: f.id,
  codigo: f.codigo,
  clienteId: f.cliente_id,
  fecha: f.fecha,
  cliente: f.cliente,
  celular: f.celular,
  factura: f.factura,
  tipoDoc: f.tipo_doc,
  numDoc: f.num_doc,
  correo: f.correo,
  pago: f.pago,
  proceso: f.proceso,
  kilos: Number(f.kilos),
  gramos: Number(f.gramos),
  n340: f.n340,
  n500: f.n500,
  n2500: f.n2500,
  estado: f.estado,
  precios: { lb: f.precio_lb, p340: f.precio_340, p500: f.precio_500, p2500: f.precio_2500 },
})

const aFila = (d: RegistroDatos, p: Precios) => ({
  cliente_id: d.clienteId,
  fecha: d.fecha,
  cliente: d.cliente.trim(),
  celular: d.celular.replace(/\D/g, ''),
  factura: d.factura,
  tipo_doc: d.tipoDoc,
  num_doc: d.factura ? d.numDoc.replace(/[\s.]/g, '') : '',
  correo: d.factura ? d.correo.trim() : '',
  pago: d.pago,
  proceso: d.proceso,
  kilos: d.kilos,
  gramos: d.gramos,
  n340: d.n340,
  n500: d.n500,
  n2500: d.n2500,
  precio_lb: p.lb,
  precio_340: p.p340,
  precio_500: p.p500,
  precio_2500: p.p2500,
})

export async function listarRegistros(): Promise<Registro[]> {
  const { data, error } = await supabase.from('lotes').select('*').order('numero', { ascending: false })
  if (error) throw error
  return data.map(aRegistro)
}

export async function obtenerRegistro(id: string): Promise<Registro> {
  const { data, error } = await supabase.from('lotes').select('*').eq('id', id).single()
  if (error) throw error
  return aRegistro(data)
}

export async function crearRegistro(datos: RegistroDatos, precios: Precios): Promise<Registro> {
  const { data, error } = await supabase.from('lotes').insert(aFila(datos, precios)).select().single()
  if (error) throw error
  return aRegistro(data)
}

/** Guarda cambios. Vuelve a "Pendiente" porque cambió lo que se va a enviar. */
export async function actualizarRegistro(id: string, datos: RegistroDatos, precios: Precios): Promise<Registro> {
  const { data, error } = await supabase
    .from('lotes')
    .update({ ...aFila(datos, precios), estado: 'Pendiente' })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return aRegistro(data)
}

export async function cambiarEstado(id: string, estado: Estado): Promise<void> {
  const cambios = estado === 'Enviado' ? { estado, enviado_at: new Date().toISOString() } : { estado }
  const { error } = await supabase.from('lotes').update(cambios).eq('id', id)
  if (error) throw error
}

export async function eliminarRegistro(id: string): Promise<void> {
  const { error } = await supabase.from('lotes').delete().eq('id', id)
  if (error) throw error
}
