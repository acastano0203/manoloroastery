import { supabase } from '../../../lib/supabase'
import type { Configuracion } from '../types'

export async function obtenerConfiguracion(): Promise<Configuracion> {
  const { data, error } = await supabase.from('configuracion').select('*').limit(1).single()
  if (error) throw error
  return {
    id: data.id,
    precios: { lb: data.precio_lb, p340: data.precio_340, p500: data.precio_500, p2500: data.precio_2500 },
    siigoUsuario: data.siigo_usuario,
  }
}

export async function guardarConfiguracion(c: Configuracion): Promise<void> {
  const { error } = await supabase
    .from('configuracion')
    .update({
      precio_lb: c.precios.lb,
      precio_340: c.precios.p340,
      precio_500: c.precios.p500,
      precio_2500: c.precios.p2500,
      siigo_usuario: c.siigoUsuario.trim(),
    })
    .eq('id', c.id)
  if (error) throw error
}
