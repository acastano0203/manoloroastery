import { supabase } from './supabase'

type Tabla = 'clientes' | 'lotes' | 'tostiones' | 'pagos' | 'configuracion'

/** Llama a `alCambiar` cada vez que otra pantalla o dispositivo cambia la tabla. Devuelve la función para cancelar. */
export function suscribirCambios(tabla: Tabla, alCambiar: () => void) {
  const canal = supabase
    .channel(`cambios-${tabla}-${Math.random().toString(36).slice(2)}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: tabla }, () => alCambiar())
    .subscribe()
  return () => {
    void supabase.removeChannel(canal)
  }
}
