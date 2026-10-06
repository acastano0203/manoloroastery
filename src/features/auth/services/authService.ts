import type { Session } from '@supabase/supabase-js'
import { supabase } from '../../../lib/supabase'

export async function obtenerSesion(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession()
  return data.session
}

export function escucharSesion(alCambiar: (s: Session | null) => void) {
  const { data } = supabase.auth.onAuthStateChange((_evento, sesion) => alCambiar(sesion))
  return () => data.subscription.unsubscribe()
}

export async function iniciarSesion(correo: string, clave: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email: correo.trim(), password: clave })
  if (error) {
    throw new Error(error.message === 'Invalid login credentials' ? 'Correo o contraseña incorrectos.' : error.message)
  }
}

export async function cerrarSesion(): Promise<void> {
  await supabase.auth.signOut()
}
