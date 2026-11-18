// Edge Function "siigo": conexión con Siigo API. La llave de acceso solo existe aquí (secretos de Supabase), nunca en el navegador.
//   accion "probar"     → prueba el usuario API y la llave (secretos SIIGO_USUARIO y SIIGO_LLAVE).
//   accion "enviar"     → crea (o actualiza, si se reabrió) la cotización del lote entregado. No es factura:
//                         la contadora la revisa en Siigo y la pasa a factura con «Facturar».
//   accion "productos"  → bolsas y drips para elegir en el lote: productos de Siigo con inventario, precio y existencias.
//   accion "catalogo"   → opciones de Configuración › Siigo (comprobantes, vendedores, productos).
// Variables de entorno (secretos de Supabase; en local, supabase/functions/.env — ver .env.example):
//   SIIGO_API_URL, SIIGO_PARTNER_ID, SIIGO_USUARIO y SIIGO_LLAVE. Los ids de la cotización (comprobante, vendedor,
//   productos) y los datos para crear clientes están en public.configuracion: se editan en Configuración › Siigo.
//   Si el cliente de un lote con factura no existe en Siigo, se crea (POST /v1/customers).
// Las columnas lotes.siigo_factura_id / siigo_factura guardan el id y el nombre de la cotización.
// Desplegar: npx supabase functions deploy siigo
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'
import {
  ajustesDeConfig, armarCliente, armarCotizacion, llaveIdempotencia, productosParaBolsas,
  type AjustesSiigo, type LoteVenta, type ProductoSiigoApi,
} from '../_shared/siigoVenta.ts'

/** Error para mostrarle al equipo tal cual. `status` es el de Siigo cuando el error viene de allá. */
class Aviso extends Error {
  constructor(mensaje: string, readonly status?: number) {
    super(mensaje)
  }
}

/** Variable de entorno obligatoria: si falta, se avisa cuál es en vez de llamar a Siigo a ciegas. */
function requerida(nombre: string): string {
  const v = (Deno.env.get(nombre) ?? '').trim()
  if (!v) throw new Aviso(`Falta la variable de entorno ${nombre} en la función de Siigo.`)
  return v
}

/** p. ej. https://api.siigo.com (sin / al final). */
const api = () => requerida('SIIGO_API_URL').replace(/\/+$/, '')
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const responder = (status: number, cuerpo: Record<string, unknown>) =>
  new Response(JSON.stringify(cuerpo), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

// ---------- Siigo ----------

/** Nombre de la app ante Siigo (obligatorio en cada petición): 3 a 100 letras o números, sin espacios. */
function partnerId(): string {
  const v = requerida('SIIGO_PARTNER_ID')
  if (!/^[a-zA-Z0-9]{3,100}$/.test(v)) throw new Aviso('SIIGO_PARTNER_ID debe tener de 3 a 100 letras o números, sin espacios.')
  return v
}

// El token dura 24 h: se guarda mientras viva la función para no pedir uno en cada envío.
let cache: { usuario: string; token: string; vence: number } | null = null

async function token(usuario: string, llave: string, nuevo = false): Promise<string> {
  if (!nuevo && cache && cache.usuario === usuario && cache.vence > Date.now()) return cache.token
  const res = await fetch(`${api()}/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Partner-Id': partnerId() },
    body: JSON.stringify({ username: usuario, access_key: llave }),
  })
  const cuerpo = await res.json().catch(() => ({}))
  if (!res.ok || !cuerpo.access_token) throw new Aviso('Siigo no aceptó el usuario API o la llave de acceso.')
  const segundos = Number(cuerpo.expires_in) || 86_400
  cache = { usuario, token: cuerpo.access_token, vence: Date.now() + (segundos - 600) * 1000 }
  return cache.token
}

/** Primer mensaje de error que devuelve Siigo ({ Errors: [{ Code, Message, Params }] }). */
function errorSiigo(cuerpo: unknown, status: number): string {
  const errores = (cuerpo as { Errors?: Array<{ Message?: string; Code?: string }> })?.Errors
  const m = errores?.map((e) => e.Message || e.Code).filter(Boolean).join(' · ')
  if (m) return `Siigo: ${m}`
  if (status === 401) return 'Siigo rechazó la sesión. Revisa el usuario API y la llave.'
  if (status === 429) return 'Siigo está recibiendo demasiadas peticiones. Espera un minuto y reenvía.'
  return `Siigo respondió con error ${status}.`
}

type Siigo = <T = Record<string, unknown>>(metodo: string, ruta: string, cuerpo?: unknown, extra?: Record<string, string>) => Promise<T>

function cliente(usuario: string, llave: string): Siigo {
  return async (metodo, ruta, cuerpo, extra = {}) => {
    for (let intento = 0; intento < 2; intento++) {
      const res = await fetch(`${api()}${ruta}`, {
        method: metodo,
        headers: {
          Authorization: `Bearer ${await token(usuario, llave, intento > 0)}`,
          'Partner-Id': partnerId(),
          'Content-Type': 'application/json',
          ...extra,
        },
        body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
      })
      // Token vencido antes de tiempo: se pide otro una vez.
      if (res.status === 401 && intento === 0) continue
      const datos = await res.json().catch(() => ({}))
      if (!res.ok) throw new Aviso(errorSiigo(datos, res.status), res.status)
      return datos
    }
    throw new Aviso('Siigo rechazó la sesión. Revisa el usuario API y la llave.')
  }
}

/** Todos los productos de Siigo (paginado de a 100). */
async function todosLosProductos(siigo: Siigo): Promise<ProductoSiigoApi[]> {
  const productos: ProductoSiigoApi[] = []
  for (let pagina = 1; pagina <= 20; pagina++) {
    const r = await siigo<{ results?: ProductoSiigoApi[]; pagination?: { total_results?: number } }>('GET', `/v1/products?page=${pagina}&page_size=100`)
    productos.push(...(r.results ?? []))
    if (!r.results?.length || productos.length >= (r.pagination?.total_results ?? 0)) break
  }
  return productos
}

async function producto(siigo: Siigo, codigo: string): Promise<ProductoSiigoApi | null> {
  const r = await siigo<{ results?: ProductoSiigoApi[] }>('GET', `/v1/products?code=${encodeURIComponent(codigo)}`)
  return r.results?.find((p) => p.code === codigo) ?? null
}

type Lista<T> = { datos: T[]; error?: string }
const lista = <T,>(r: unknown): T[] => (Array.isArray(r) ? r : ((r as { results?: T[] })?.results ?? [])) as T[]
async function intentar<T>(siigo: Siigo, ruta: string): Promise<Lista<T>> {
  try {
    return { datos: lista<T>(await siigo('GET', ruta)) }
  } catch (e) {
    return { datos: [], error: e instanceof Error ? e.message : 'No se pudo leer.' }
  }
}

type DocTipo = { id: number; code?: string; name?: string; active?: boolean }
type Usuario = { id: number; username?: string; first_name?: string; last_name?: string; active?: boolean }
const comprobantes = (siigo: Siigo) => intentar<DocTipo>(siigo, '/v1/document-types?type=C')
const vendedores = async (siigo: Siigo): Promise<Lista<{ id: number; name?: string; active?: boolean }>> => {
  const r = await intentar<Usuario>(siigo, '/v1/users')
  return { ...r, datos: r.datos.map((u) => ({ id: u.id, name: [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username, active: u.active })) }
}

/** El id configurado, o el único activo en Siigo. Si hay varios, hay que elegirlo en Configuración › Siigo. */
function unico(configurado: number | null, l: Lista<{ id: number; active?: boolean }>, que: string): number {
  if (configurado) return configurado
  const activos = l.datos.filter((x) => x.active !== false)
  if (activos.length === 1) return activos[0].id
  if (l.error) throw new Aviso(`No se pudo leer el ${que} de Siigo. ${l.error}`)
  throw new Aviso(activos.length
    ? `En Siigo hay varios: elige el ${que} en Configuración › Siigo.`
    : `No hay ningún ${que} activo en Siigo.`)
}

// ---------- acciones ----------

type Doc = { id: string; name: string }

async function enviar(admin: SupabaseClient, siigo: Siigo, a: AjustesSiigo, loteId: string) {
  const { data: lote, error } = await admin.from('lotes').select('*').eq('id', loteId).maybeSingle()
  if (error || !lote) throw new Aviso('No se encontró el lote.')
  const l = lote as LoteVenta & { siigo_factura_id: string | null; siigo_factura: string | null }

  const [docs, usuarios] = await Promise.all([
    a.documentoId ? null : comprobantes(siigo),
    a.vendedorId ? null : vendedores(siigo),
  ])
  const resueltos = {
    ...a,
    documentoId: unico(a.documentoId, docs ?? { datos: [] }, 'comprobante de cotización'),
    vendedorId: unico(a.vendedorId, usuarios ?? { datos: [] }, 'vendedor'),
  }
  let venta: ReturnType<typeof armarCotizacion>
  try {
    venta = armarCotizacion(l, resueltos)
  } catch (e) {
    throw new Aviso(e instanceof Error ? e.message : 'Faltan datos para la cotización.')
  }

  // El cliente debe existir en Siigo; los que tienen factura a nombre propio se crean si no están.
  const { identification } = venta.cotizacion.customer
  const clientes = await siigo<{ results?: Array<{ identification: string; active?: boolean }> }>(
    'GET', `/v1/customers?identification=${encodeURIComponent(identification)}`)
  const c = clientes.results?.find((x) => x.identification === identification)
  if (!c) {
    // Consumidor final o creación apagada: se crea a mano en Siigo.
    if (!l.factura) throw new Aviso(`El cliente de consumidor final (${identification}) no existe en Siigo. Créalo allá y reenvía.`)
    if (!a.crearClientes) throw new Aviso(`El cliente con identificación ${identification} no existe en Siigo. Créalo allá y reenvía.`)
    let nuevo: ReturnType<typeof armarCliente>
    try {
      nuevo = armarCliente(l, a)
    } catch (e) {
      throw new Aviso(e instanceof Error ? e.message : 'Faltan datos para crear el cliente en Siigo.')
    }
    await siigo('POST', '/v1/customers', nuevo)
  } else if (c.active === false) {
    throw new Aviso(`El cliente ${identification} está inactivo en Siigo.`)
  }

  // Productos: deben existir y estar activos. El inventario no se revisa: la cotización no descuenta bolsas
  // (las descuenta la factura que haga la contadora).
  for (const it of venta.cotizacion.items) {
    const p = await producto(siigo, it.code)
    if (!p) throw new Aviso(`El producto ${it.code} no existe en Siigo.`)
    if (p.active === false) throw new Aviso(`El producto ${it.code} está inactivo en Siigo.`)
  }

  const crear = (cuerpo: unknown) => siigo<Doc>('POST', '/v1/quotations', cuerpo, { 'Idempotency-Key': llaveIdempotencia(l) })
  let cot: Doc
  if (!l.siigo_factura_id) {
    // Primera vez: se crea (con idempotencia, así reenviar no la duplica).
    cot = await crear(venta.cotizacion)
  } else {
    // Reabierto: se actualiza la misma cotización. Si Siigo no deja (no existe o ya no se puede editar),
    // se crea otra que dice a cuál reemplaza, para que la contadora use la nueva.
    try {
      cot = await siigo<Doc>('PUT', `/v1/quotations/${l.siigo_factura_id}`, venta.cotizacion)
    } catch (e) {
      if (!(e instanceof Aviso) || ![404, 405].includes(e.status ?? 0)) throw e
      cot = await crear(armarCotizacion(l, resueltos, undefined, l.siigo_factura).cotizacion)
    }
  }

  const { error: errGuardar } = await admin.from('lotes').update({
    estado: 'Enviado', enviado_at: new Date().toISOString(),
    siigo_factura_id: cot.id, siigo_factura: cot.name ?? null, siigo_error: null, siigo_bolsas: l.bolsas ?? [],
  }).eq('id', loteId)
  // La cotización ya quedó en Siigo: si no se pudo anotar, se avisa con su número para no crear otra.
  if (errGuardar) throw new Aviso(`La cotización ${cot.name} quedó en Siigo, pero no se pudo anotar en el lote. Reenvía: no se duplica.`)
  return { cotizacion: cot.name, total: venta.total }
}

/** Bolsas y drips para elegir al recibir o empacar: productos de Siigo con inventario, su precio y cuántas hay. */
async function productos(siigo: Siigo) {
  return { productos: productosParaBolsas(await todosLosProductos(siigo)) }
}

/** Opciones de Configuración › Siigo: comprobantes de cotización, vendedores y productos (para la torrefacción). */
async function catalogo(siigo: Siigo) {
  const [cotizaciones, usuarios, todos] = await Promise.all([comprobantes(siigo), vendedores(siigo), todosLosProductos(siigo)])
  return {
    cotizaciones, vendedores: usuarios,
    productos: todos.filter((p) => p.active !== false).map((p) => ({ code: p.code, name: p.name, stock_control: p.stock_control })),
  }
}

// ---------- entrada ----------

interface Pedido { accion?: 'probar' | 'enviar' | 'productos' | 'catalogo'; loteId?: string }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return responder(405, { error: 'Método no permitido.' })

  const url = Deno.env.get('SUPABASE_URL')!
  const comoUsuario = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  })
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } })

  let pedido: Pedido
  try {
    pedido = await req.json()
  } catch {
    return responder(400, { error: 'Pedido no válido.' })
  }

  // Permisos con la sesión de quien llama: enviar y la lista de bolsas son del tablero; probar y el catálogo, de configuración.
  const permiso = pedido.accion === 'enviar' || pedido.accion === 'productos' ? 'tablero' : 'configuracion'
  const { data: puede, error: errPermiso } = await comoUsuario.rpc('tiene_permiso', { p: permiso })
  if (errPermiso) return responder(401, { error: 'Inicia sesión de nuevo.' })
  if (!puede) return responder(403, { error: 'Tu rol no puede hacer esto.' })

  // Usuario y llave solo desde los secretos: nunca llegan desde el navegador.
  // Lo fijo de Siigo (torrefacción y cliente) lo edita el equipo en Configuración › Siigo.
  const { data: config } = await admin.from('configuracion').select('*').limit(1).maybeSingle()
  const ajustes = ajustesDeConfig(config)
  const usuario = (Deno.env.get('SIIGO_USUARIO') ?? '').trim()
  const llave = (Deno.env.get('SIIGO_LLAVE') ?? '').trim()

  try {
    if (!usuario || !llave) throw new Aviso('Falta el usuario API o la llave de acceso de Siigo (secretos SIIGO_USUARIO y SIIGO_LLAVE).')
    const siigo = cliente(usuario, llave)

    if (pedido.accion === 'probar') {
      await token(usuario, llave, true)
      return responder(200, { ok: true })
    }
    if (pedido.accion === 'productos') return responder(200, await productos(siigo))
    if (pedido.accion === 'catalogo') return responder(200, await catalogo(siigo))
    if (pedido.accion === 'enviar') {
      if (!pedido.loteId) throw new Aviso('Falta el lote.')
      try {
        return responder(200, await enviar(admin, siigo, ajustes, pedido.loteId))
      } catch (e) {
        const motivo = e instanceof Error ? e.message : 'No se pudo enviar.'
        await admin.from('lotes').update({ estado: 'Error', siigo_error: motivo }).eq('id', pedido.loteId)
        throw e
      }
    }
    return responder(400, { error: 'Acción no válida.' })
  } catch (e) {
    if (e instanceof Aviso) return responder(400, { error: e.message })
    console.error(e)
    const motivo = e instanceof Error ? e.message : 'Algo salió mal.'
    return responder(502, { error: `No se pudo hablar con Siigo. ${motivo}` })
  }
})
