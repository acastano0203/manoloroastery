import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabaseConfigurado = Boolean(url && key)

// Con .env.local vacío la app muestra una pantalla de configuración en vez de fallar.
export const supabase = createClient<Database>(
  url || 'http://localhost:54321',
  key || 'sin-configurar'
)
