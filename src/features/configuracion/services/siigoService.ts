// Conexión con Siigo a través de la Edge Function "siigo" (supabase/functions/siigo): la llave de acceso vive en sus
// secretos, nunca en el navegador. La función revisa los permisos con la sesión de quien llama.

import { supabase } from '../../../lib/supabase'
import type { ProductoBolsa } from '../../../../supabase/functions/_shared/siigoVenta'

export type { ProductoBolsa }

async function llamar<T>(cuerpo: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('siigo', { body: cuerpo })
  if (error) {
    // La función responde { error } con el motivo; supabase-js lo deja en error.context (la respuesta).
    const ctx = (error as { context?: Response }).context
    const motivo = ctx && typeof ctx.json === 'function' ? await ctx.json().then((j) => j?.error).catch(() => null) : null
    throw new Error(motivo || 'No se pudo conectar con Siigo. Revisa que la función «siigo» esté publicada.')
  }
  return data as T
}

/** Prueba el usuario API y la llave guardados en los secretos de la función. */
export async function probarConexionSiigo(): Promise<void> {
  await llamar({ accion: 'probar' })
}

/** Crea (o actualiza, si se reabrió) la cotización del lote en Siigo. Lanza un error con el motivo si no se pudo. */
export async function enviarLoteASiigo(loteId: string): Promise<{ cotizacion: string; total: number }> {
  return llamar({ accion: 'enviar', loteId })
}

/** Bolsas y drips para elegir en el lote: productos de Siigo con inventario, su precio de venta y cuántas hay. */
export async function listarBolsasSiigo(): Promise<ProductoBolsa[]> {
  const r = await llamar<{ productos: ProductoBolsa[] }>({ accion: 'productos' })
  return r.productos ?? []
}

interface ItemCatalogo { id?: number; code?: string; name?: string; active?: boolean; stock_control?: boolean }
type ListaCatalogo = { datos: ItemCatalogo[]; error?: string }
export interface CatalogoSiigo {
  cotizaciones: ListaCatalogo
  vendedores: ListaCatalogo
  productos: ItemCatalogo[]
}

/** Opciones de Configuración › Siigo: comprobantes de cotización, vendedores y productos. */
export async function consultarCatalogoSiigo(): Promise<CatalogoSiigo> {
  return llamar({ accion: 'catalogo' })
}
