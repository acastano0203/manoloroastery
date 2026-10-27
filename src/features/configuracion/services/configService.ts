import { supabase } from '../../../lib/supabase'
import type { Database } from '../../../types/database'
import type { Configuracion, Inventario } from '../types'

export async function obtenerConfiguracion(): Promise<Configuracion> {
  const { data, error } = await supabase.from('configuracion').select('*').limit(1).single()
  if (error) throw error
  return {
    id: data.id,
    precios: { lb: data.precio_lb, p340: data.precio_340, p500: data.precio_500, p2500: data.precio_2500, pDrip: data.precio_drip },
    siigoUsuario: data.siigo_usuario,
    inventario: { n340: data.stock_340, n500: data.stock_500, n2500: data.stock_2500, nDrip: data.stock_drip },
  }
}

/**
 * Fija la cantidad en bodega de lo que se contó. Solo manda lo que cambió:
 * el resto lo sigue descontando la base, y mandarlo pisaría lo que se haya usado mientras tanto.
 */
export async function ajustarInventario(id: string, cambios: Partial<Inventario>): Promise<void> {
  const fila: Database['public']['Tables']['configuracion']['Update'] = {}
  if ('n340' in cambios) fila.stock_340 = cambios.n340
  if ('n500' in cambios) fila.stock_500 = cambios.n500
  if ('n2500' in cambios) fila.stock_2500 = cambios.n2500
  if ('nDrip' in cambios) fila.stock_drip = cambios.nDrip
  if (!Object.keys(fila).length) return
  const { error } = await supabase.from('configuracion').update(fila).eq('id', id)
  if (error) throw error
}

export async function guardarConfiguracion(c: Configuracion): Promise<void> {
  const { error } = await supabase
    .from('configuracion')
    .update({
      precio_lb: c.precios.lb,
      precio_340: c.precios.p340,
      precio_500: c.precios.p500,
      precio_2500: c.precios.p2500,
      precio_drip: c.precios.pDrip,
      siigo_usuario: c.siigoUsuario.trim(),
    })
    .eq('id', c.id)
  if (error) throw error
}
