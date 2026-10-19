import { supabase } from '../../../lib/supabase'
import type { Database } from '../../../types/database'
import type { CambiosTostion, Lectura, Tostion } from '../types'

type FilaTostion = Database['public']['Tables']['tostiones']['Row']
type FilaLectura = Database['public']['Tables']['tostion_lecturas']['Row']

const num = (v: number | null) => (v === null ? null : Number(v))

const aLectura = (f: FilaLectura): Lectura => ({
  id: f.id, segundo: f.segundo, tempGrano: num(f.temp_grano), tempTambor: num(f.temp_tambor), aire: f.aire, llama: f.llama,
})

const aTostion = (f: FilaTostion & { tostion_lecturas: FilaLectura[] | null }): Tostion => ({
  id: f.id,
  loteId: f.lote_id,
  origen: f.origen,
  gramosVerde: f.gramos_verde_entrada,
  tempCarga: num(f.temp_carga_c),
  aireInicial: f.aire_inicial,
  llamaInicial: f.llama_inicial,
  iniciadaAt: f.iniciada_at,
  crackSeg: f.crack_seg,
  descargaSeg: f.descarga_seg,
  notas: f.notas,
  archivo: f.archivo_curva,
  creadaAt: f.created_at,
  lecturas: (f.tostion_lecturas ?? []).map(aLectura).sort((a, b) => a.segundo - b.segundo),
})

/** Las tostiones del lote, de la primera a la última, con sus lecturas. */
export async function listarTostiones(loteId: string): Promise<Tostion[]> {
  const { data, error } = await supabase
    .from('tostiones')
    .select('*, tostion_lecturas(*)')
    .eq('lote_id', loteId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data as Array<FilaTostion & { tostion_lecturas: FilaLectura[] }>).map(aTostion)
}

export async function crearTostionManual(loteId: string, datos: Required<Pick<CambiosTostion, 'gramosVerde'>> & CambiosTostion): Promise<void> {
  const { error } = await supabase.from('tostiones').insert({
    lote_id: loteId, origen: 'manual', gramos_verde_entrada: datos.gramosVerde, temp_carga_c: datos.tempCarga ?? null,
    aire_inicial: datos.aireInicial ?? null, llama_inicial: datos.llamaInicial ?? null,
  })
  if (error) throw error
}

export async function actualizarTostion(id: string, c: CambiosTostion): Promise<void> {
  const cambios: Database['public']['Tables']['tostiones']['Update'] = {}
  if (c.gramosVerde !== undefined) cambios.gramos_verde_entrada = c.gramosVerde
  if (c.tempCarga !== undefined) cambios.temp_carga_c = c.tempCarga
  if (c.aireInicial !== undefined) cambios.aire_inicial = c.aireInicial
  if (c.llamaInicial !== undefined) cambios.llama_inicial = c.llamaInicial
  if (c.iniciadaAt !== undefined) cambios.iniciada_at = c.iniciadaAt
  if (c.notas !== undefined) cambios.notas = c.notas
  if (c.crackSeg !== undefined) cambios.crack_seg = c.crackSeg
  if (c.descargaSeg !== undefined) {
    cambios.descarga_seg = c.descargaSeg
    cambios.tiempo_total_min = c.descargaSeg === null ? null : Math.round((c.descargaSeg / 60) * 100) / 100
  }
  // Con los dos momentos se guarda también el tiempo de desarrollo (para reportes en la base).
  if (c.crackSeg !== undefined && c.descargaSeg !== undefined) {
    cambios.tiempo_desarrollo_min = c.crackSeg !== null && c.descargaSeg !== null
      ? Math.round(((c.descargaSeg - c.crackSeg) / 60) * 100) / 100
      : null
  }
  const { error } = await supabase.from('tostiones').update(cambios).eq('id', id)
  if (error) throw error
}

/** Guarda la lectura de ese momento. Si ya había una, la reemplaza. */
export async function guardarLectura(tostionId: string, l: Omit<Lectura, 'id'>): Promise<void> {
  const { error } = await supabase.from('tostion_lecturas').upsert(
    { tostion_id: tostionId, segundo: l.segundo, temp_grano: l.tempGrano, temp_tambor: l.tempTambor, aire: l.aire, llama: l.llama },
    { onConflict: 'tostion_id,segundo' },
  )
  if (error) throw error
}

export async function borrarLectura(id: string): Promise<void> {
  const { error } = await supabase.from('tostion_lecturas').delete().eq('id', id)
  if (error) throw error
}

/** Sube el PDF de la curva que exporta el software del tostador y crea la tostión automática. */
export async function subirCurvaAutomatica(loteId: string, archivo: File, gramosVerde: number, notas: string): Promise<void> {
  const ruta = `${loteId}/curvas/${Date.now()}-${archivo.name.replace(/[^\w.-]+/g, '_')}`
  const subida = await supabase.storage.from('lotes').upload(ruta, archivo, { contentType: 'application/pdf' })
  if (subida.error) throw subida.error
  const { error } = await supabase.from('tostiones').insert({
    lote_id: loteId, origen: 'automatica', gramos_verde_entrada: gramosVerde, archivo_curva: ruta, notas: notas.trim() || null,
  })
  if (error) {
    await supabase.storage.from('lotes').remove([ruta])
    throw error
  }
}

/** Borra la tostión (con sus lecturas) y su PDF si tenía. */
export async function eliminarTostion(t: Pick<Tostion, 'id' | 'archivo'>): Promise<void> {
  const { error } = await supabase.from('tostiones').delete().eq('id', t.id)
  if (error) throw error
  if (t.archivo) await supabase.storage.from('lotes').remove([t.archivo])
}
