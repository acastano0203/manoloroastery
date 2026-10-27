// Edge Function: un administrador (o un rol con permiso de Administración) crea un usuario (correo + contraseña) y le asigna un rol.
// Usa la llave de servicio, que solo existe aquí (Supabase la inyecta como variable de entorno), nunca en el navegador.
// Desplegar: npx supabase functions deploy crear-usuario
import { createClient } from 'npm:@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const responder = (status: number, cuerpo: Record<string, unknown>) =>
  new Response(JSON.stringify(cuerpo), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

interface Pedido {
  correo?: string
  clave?: string
  nombre?: string
  rolId?: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return responder(405, { error: 'Método no permitido.' })

  const url = Deno.env.get('SUPABASE_URL')!
  const anon = Deno.env.get('SUPABASE_ANON_KEY')!
  const servicio = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  // 1. Quien llama debe poder usar Administración (se revisa con su propia sesión).
  const autorizacion = req.headers.get('Authorization') ?? ''
  const comoUsuario = createClient(url, anon, { global: { headers: { Authorization: autorizacion } } })
  const { data: administra, error: errAdmin } = await comoUsuario.rpc('administra')
  if (errAdmin) return responder(401, { error: 'Inicia sesión de nuevo.' })
  if (!administra) return responder(403, { error: 'Tu rol no puede crear usuarios.' })

  // 2. Datos del usuario nuevo.
  let pedido: Pedido
  try {
    pedido = await req.json()
  } catch {
    return responder(400, { error: 'Pedido no válido.' })
  }
  const correo = (pedido.correo ?? '').trim().toLowerCase()
  const clave = pedido.clave ?? ''
  const nombre = (pedido.nombre ?? '').trim().slice(0, 80) || null
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(correo)) return responder(400, { error: 'Correo no válido.' })
  if (clave.length < 8) return responder(400, { error: 'La contraseña debe tener al menos 8 caracteres.' })
  if (!pedido.rolId) return responder(400, { error: 'Elige un rol.' })

  const admin = createClient(url, servicio, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: rol } = await admin.from('roles').select('id, nombre, administrador').eq('id', pedido.rolId).maybeSingle()
  if (!rol) return responder(400, { error: 'Ese rol ya no existe.' })
  if (rol.administrador) {
    const { data: esAdmin } = await comoUsuario.rpc('es_admin')
    if (!esAdmin) return responder(403, { error: 'Solo un administrador puede crear usuarios con el rol Administrador.' })
  }

  // 3. Crea el usuario (ya confirmado: entra con esa contraseña). El perfil lo crea un trigger.
  const { data: creado, error: errCrear } = await admin.auth.admin.createUser({ email: correo, password: clave, email_confirm: true })
  if (errCrear || !creado.user) {
    const yaExiste = /already|registered|exists/i.test(errCrear?.message ?? '')
    return responder(yaExiste ? 409 : 400, { error: yaExiste ? 'Ya existe un usuario con ese correo.' : errCrear?.message ?? 'No se pudo crear el usuario.' })
  }

  // 4. Rol y nombre. Si falla, se borra el usuario para no dejarlo a medias.
  const { error: errPerfil } = await admin.from('perfiles')
    .upsert({ id: creado.user.id, correo, nombre, rol_id: rol.id }, { onConflict: 'id' })
  if (errPerfil) {
    await admin.auth.admin.deleteUser(creado.user.id)
    return responder(500, { error: 'No se pudo asignar el rol. Intenta de nuevo.' })
  }

  return responder(200, { id: creado.user.id, correo, rol: rol.nombre })
})
