import { supabase } from '../../../lib/supabase'
import type { Database } from '../../../types/database'
import type { Precios } from '../../configuracion/types'
import type { Almacenamiento, Empaque, Estado, Etapa, Registro, RegistroDatos } from '../types'

type Fila = Database['public']['Tables']['lotes']['Row']

const aRegistro = (f: Fila): Registro => ({
  id: f.id,
  codigo: f.codigo,
  clienteId: f.cliente_id,
  fecha: f.fecha,
  cliente: f.cliente,
  celular: f.celular,
  factura: f.factura,
  tipoDoc: f.tipo_doc,
  numDoc: f.num_doc,
  correo: f.correo,
  pago: f.pago,
  proceso: f.proceso,
  kilos: Number(f.kilos),
  humedad: f.humedad_pct === null ? null : Number(f.humedad_pct),
  densidad: f.densidad_gl === null ? null : Number(f.densidad_gl),
  gramos: f.gramos === null ? null : Number(f.gramos),
  n340: f.n340,
  n500: f.n500,
  n2500: f.n2500,
  nDrip: f.n_drip,
  bolsasCliente: f.bolsas_cliente,
  gramosTostado: f.gramos_tostado,
  estado: f.estado,
  etapa: f.etapa,
  llegada: f.llegada,
  entregadoAt: f.entregado_at,
  reabiertoAt: f.reabierto_at,
  almacenamiento: f.almacenamiento && f.almacen_dias && f.almacen_gramos && f.almacen_marcado && f.almacen_foto
    ? { dias: f.almacen_dias, gramos: f.almacen_gramos, unidad: f.almacen_unidad, marcado: f.almacen_marcado, foto: f.almacen_foto }
    : null,
  precios: { lb: f.precio_lb, p340: f.precio_340, p500: f.precio_500, p2500: f.precio_2500, pDrip: f.precio_drip },
})

const aFila = (d: RegistroDatos, p: Precios) => ({
  cliente_id: d.clienteId,
  fecha: d.fecha,
  cliente: d.cliente.trim(),
  celular: d.celular.replace(/\D/g, ''),
  factura: d.factura,
  tipo_doc: d.tipoDoc,
  num_doc: d.factura ? d.numDoc.replace(/[\s.]/g, '') : '',
  correo: d.factura ? d.correo.trim() : '',
  pago: d.pago,
  proceso: d.proceso,
  kilos: d.kilos,
  humedad_pct: d.humedad,
  densidad_gl: d.densidad,
  gramos: d.gramos,
  n340: d.n340,
  n500: d.n500,
  n2500: d.n2500,
  n_drip: d.nDrip,
  bolsas_cliente: d.bolsasCliente,
  gramos_tostado: d.gramosTostado,
  precio_lb: p.lb,
  precio_340: p.p340,
  precio_500: p.p500,
  precio_2500: p.p2500,
  precio_drip: p.pDrip,
})

export async function listarRegistros(): Promise<Registro[]> {
  const { data, error } = await supabase.from('lotes').select('*').order('numero', { ascending: false })
  if (error) throw error
  return data.map(aRegistro)
}

export async function obtenerRegistro(id: string): Promise<Registro> {
  const { data, error } = await supabase.from('lotes').select('*').eq('id', id).single()
  if (error) throw error
  return aRegistro(data)
}

export async function crearRegistro(datos: RegistroDatos, precios: Precios): Promise<Registro> {
  const { data, error } = await supabase.from('lotes').insert(aFila(datos, precios)).select().single()
  if (error) throw error
  return aRegistro(data)
}

/** Guarda cambios. Vuelve a "Pendiente" porque cambió lo que se va a enviar. */
export async function actualizarRegistro(id: string, datos: RegistroDatos, precios: Precios): Promise<Registro> {
  const { data, error } = await supabase
    .from('lotes')
    .update({ ...aFila(datos, precios), estado: 'Pendiente' })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return aRegistro(data)
}

export async function cambiarEstado(id: string, estado: Estado): Promise<void> {
  const cambios = estado === 'Enviado' ? { estado, enviado_at: new Date().toISOString() } : { estado }
  const { error } = await supabase.from('lotes').update(cambios).eq('id', id)
  if (error) throw error
}

/** Reabre un lote enviado: vuelve a Pendiente (sigue en Entregado) para modificarlo y enviarlo otra vez. */
export async function reabrirRegistro(id: string): Promise<void> {
  const { error } = await supabase.from('lotes')
    .update({ estado: 'Pendiente', enviado_at: null, reabierto_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

/** Lo que se anota al pasar de etapa: el café a tostar al tostar; bolsas, drips y peso tostado al empacar. */
export type DatosPaso =
  | { gramos: number }
  | (Empaque & { gramosTostado: number })
  /** Al entregar: null si no requiere almacenamiento; si requiere, con la foto por subir. */
  | { almacenamiento: (Omit<Almacenamiento, 'foto'> & { foto: File }) | null }

/** Sube la foto del almacenamiento a la carpeta "lotes" y devuelve su ruta. */
async function subirFotoAlmacen(loteId: string, foto: File): Promise<string> {
  const ext = (foto.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '')
  const ruta = `${loteId}/almacenamiento/${Date.now()}.${ext}`
  const { error } = await supabase.storage.from('lotes').upload(ruta, foto, { contentType: foto.type || 'image/jpeg' })
  if (error) throw error
  return ruta
}

const aCambios = async (id: string, d?: DatosPaso) => {
  if (!d) return {}
  if ('gramos' in d) return { gramos: d.gramos }
  if ('almacenamiento' in d) {
    const a = d.almacenamiento
    if (!a) return { almacenamiento: false, almacen_dias: null, almacen_gramos: null, almacen_unidad: 'g' as const, almacen_marcado: null, almacen_foto: null }
    return {
      almacenamiento: true, almacen_dias: a.dias, almacen_gramos: a.gramos, almacen_unidad: a.unidad, almacen_marcado: a.marcado.trim(),
      almacen_foto: await subirFotoAlmacen(id, a.foto),
    }
  }
  return { n340: d.n340, n500: d.n500, n2500: d.n2500, n_drip: d.nDrip, bolsas_cliente: d.bolsasCliente, gramos_tostado: d.gramosTostado }
}

/** Mueve el lote de etapa. Al entregar guarda la hora; si se devuelve, la borra. */
export async function cambiarEtapa(id: string, etapa: Etapa, datos?: DatosPaso): Promise<void> {
  const entregado_at = etapa === 'Entregado' ? new Date().toISOString() : null
  const { error } = await supabase.from('lotes').update({ ...(await aCambios(id, datos)), etapa, entregado_at }).eq('id', id)
  if (error) throw error
}

export async function eliminarRegistro(id: string): Promise<void> {
  const { error } = await supabase.from('lotes').delete().eq('id', id)
  if (error) throw error
}
