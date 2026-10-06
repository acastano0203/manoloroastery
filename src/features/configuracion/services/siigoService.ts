// SIMULACIÓN de la integración con Siigo (igual que en el diseño).
// Para conectarla de verdad: crea una Edge Function de Supabase que reciba el id del registro,
// lea la llave de acceso desde sus secretos (nunca desde el navegador) y llame la API de Siigo.
// Luego reemplaza estas funciones por `supabase.functions.invoke('siigo-...')`.

import type { Registro } from '../../registros/types'

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms))

export async function probarConexionSiigo(usuario: string, llave: string): Promise<void> {
  if (!usuario.trim() || !llave.trim()) throw new Error('Completa el usuario API y la llave de acceso para probar.')
  await esperar(1400)
}

/** Envía el registro a contabilidad. Lanza un error con el motivo si no se pudo. */
export async function enviarRegistroASiigo(r: Registro): Promise<void> {
  await esperar(1500)
  if (r.factura && !r.numDoc) throw new Error('Falta el número de documento para la factura.')
}
