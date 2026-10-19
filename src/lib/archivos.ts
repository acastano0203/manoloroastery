import { supabase } from './supabase'

/** Enlace temporal (1 hora) a un archivo de la carpeta privada "lotes" (fotos, PDF de curvas). */
export async function enlaceArchivo(ruta: string): Promise<string> {
  const { data, error } = await supabase.storage.from('lotes').createSignedUrl(ruta, 3600)
  if (error) throw error
  return data.signedUrl
}
