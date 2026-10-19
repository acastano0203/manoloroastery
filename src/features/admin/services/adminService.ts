import { supabase } from '../../../lib/supabase'
import type { Perfil, Permiso, Rol } from '../types'

export async function listarRoles(): Promise<Rol[]> {
  const { data, error } = await supabase.from('roles').select('*, rol_permisos(permiso)').order('created_at')
  if (error) throw error
  return (data as Array<{ id: string; nombre: string; administrador: boolean; rol_permisos: Array<{ permiso: Permiso }> }>)
    .map((r) => ({ id: r.id, nombre: r.nombre, administrador: r.administrador, permisos: r.rol_permisos.map((x) => x.permiso) }))
}

/** Perfiles visibles: el propio, o todos si es administrador. */
export async function listarPerfiles(): Promise<Perfil[]> {
  const { data, error } = await supabase.from('perfiles').select('*').order('correo')
  if (error) throw error
  return data.map((p) => ({ id: p.id, correo: p.correo, nombre: p.nombre, rolId: p.rol_id }))
}

export async function crearRol(nombre: string): Promise<void> {
  const { error } = await supabase.from('roles').insert({ nombre: nombre.trim() })
  if (error) throw error.code === '23505' ? new Error(`Ya existe un rol llamado "${nombre.trim()}".`) : error
}

export async function renombrarRol(id: string, nombre: string): Promise<void> {
  const { error } = await supabase.from('roles').update({ nombre: nombre.trim() }).eq('id', id)
  if (error) throw error.code === '23505' ? new Error(`Ya existe un rol llamado "${nombre.trim()}".`) : error
}

export async function eliminarRol(id: string): Promise<void> {
  const { error } = await supabase.from('roles').delete().eq('id', id)
  if (error) throw error
}

export async function cambiarPermiso(rolId: string, permiso: Permiso, activo: boolean): Promise<void> {
  const { error } = activo
    ? await supabase.from('rol_permisos').upsert({ rol_id: rolId, permiso }, { ignoreDuplicates: true })
    : await supabase.from('rol_permisos').delete().eq('rol_id', rolId).eq('permiso', permiso)
  if (error) throw error
}

export async function asignarRol(perfilId: string, rolId: string | null): Promise<void> {
  const { data, error } = await supabase.from('perfiles').update({ rol_id: rolId }).eq('id', perfilId).select('id')
  if (error) throw error
  if (!data.length) throw new Error('No tienes permiso para cambiar el rol de este usuario.')
}

export async function cambiarNombre(perfilId: string, nombre: string): Promise<void> {
  const { error } = await supabase.from('perfiles').update({ nombre: nombre.trim() || null }).eq('id', perfilId)
  if (error) throw error
}

export interface NuevoUsuario {
  correo: string
  clave: string
  nombre: string
  rolId: string
}

/** Crea un usuario con su rol, a través de la Edge Function "crear-usuario" (solo administradores). */
export async function crearUsuario(u: NuevoUsuario): Promise<void> {
  const { error } = await supabase.functions.invoke('crear-usuario', { body: u })
  if (!error) return
  // La función responde { error: "mensaje" }; si no se puede leer, un mensaje general.
  const respuesta = (error as { context?: Response }).context
  let mensaje: string | undefined
  try {
    mensaje = respuesta ? (await respuesta.json()).error : undefined
  } catch { /* sin cuerpo */ }
  if (!mensaje && /Failed to send|fetch/i.test(error.message)) {
    mensaje = 'No se pudo contactar el servicio para crear usuarios. ¿Ya se desplegó la función "crear-usuario"?'
  }
  throw new Error(mensaje ?? error.message)
}
