import { supabase } from '../../../lib/supabase'
import type { Database } from '../../../types/database'
import type { AjustesSiigo, Configuracion } from '../types'

type Fila = Database['public']['Tables']['configuracion']['Row']

const aAjustesSiigo = (d: Fila): AjustesSiigo => ({
  tostion: d.siigo_producto_tostion ?? 'STORRE',
  cotizacionId: d.siigo_cotizacion_id ?? null,
  vendedorId: d.siigo_vendedor_id ?? null,
  consumidorFinal: d.siigo_consumidor_final ?? '222222222222',
  crearClientes: d.siigo_crear_clientes ?? true,
  direccion: d.siigo_direccion ?? '',
  departamento: d.siigo_departamento ?? '',
  ciudad: d.siigo_ciudad ?? '',
})

export async function obtenerConfiguracion(): Promise<Configuracion> {
  const { data, error } = await supabase.from('configuracion').select('*').limit(1).single()
  if (error) throw error
  return {
    id: data.id,
    precios: { lb: data.precio_lb, p340: data.precio_340, p500: data.precio_500, p2500: data.precio_2500, pDrip: data.precio_drip },
    siigo: aAjustesSiigo(data),
  }
}

/** Guarda los ids y códigos de Siigo (Configuración › Siigo). */
export async function guardarAjustesSiigo(id: string, a: AjustesSiigo): Promise<void> {
  const { error } = await supabase
    .from('configuracion')
    .update({
      siigo_producto_tostion: a.tostion.trim() || 'STORRE',
      siigo_cotizacion_id: a.cotizacionId,
      siigo_vendedor_id: a.vendedorId,
      siigo_consumidor_final: a.consumidorFinal.trim() || '222222222222',
      siigo_crear_clientes: a.crearClientes,
      siigo_direccion: a.direccion.trim(),
      siigo_departamento: a.departamento.trim(),
      siigo_ciudad: a.ciudad.trim(),
    })
    .eq('id', id)
  if (error) throw error
}

export async function guardarConfiguracion(c: Configuracion): Promise<void> {
  const { error } = await supabase
    .from('configuracion')
    .update({
      precio_lb: c.precios.lb,
    })
    .eq('id', c.id)
  if (error) throw error
}
