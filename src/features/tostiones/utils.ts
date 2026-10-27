import type { Lectura, Tostion } from './types'

/** 125 → "2:05" */
export function mmss(segundos: number) {
  const s = Math.max(0, Math.round(segundos))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/** "2:05" o "2" (minutos) → 125. Vacío → null, inválido → NaN. */
export function leerMmss(texto: string): number | null {
  const t = texto.trim()
  if (!t) return null
  const m = /^(\d{1,2})(?::(\d{1,2}))?$/.exec(t)
  if (!m) return NaN
  const seg = m[2] === undefined ? 0 : Number(m[2])
  if (seg > 59) return NaN
  return Number(m[1]) * 60 + seg
}

/** Segundos desde que arrancó el cronómetro. */
export const segundosDesde = (iniciadaAt: string, ahora = Date.now()) =>
  Math.max(0, Math.floor((ahora - new Date(iniciadaAt).getTime()) / 1000))

export interface Fase {
  /** Duración de la fase, en segundos. */
  seg: number | null
  /** % del tiempo total de la curva. */
  pct: number | null
}

/**
 * Las tres fases de la tostión, cada una como % del tiempo total (del inicio al fin de la curva):
 * secado (inicio → fin de secado), Maillard (fin de secado → 1er crack) y desarrollo (1er crack → fin de curva).
 * Las tres suman 100 %. Una fase sin sus dos marcas queda vacía.
 */
export function fasesTostion(t: Pick<Tostion, 'secadoSeg' | 'crackSeg' | 'descargaSeg'>) {
  const total = t.descargaSeg
  const fase = (desde: number | null, hasta: number | null): Fase => {
    const seg = desde !== null && hasta !== null ? hasta - desde : null
    return { seg, pct: seg !== null && total ? (seg / total) * 100 : null }
  }
  return {
    total,
    secado: fase(t.secadoSeg === null ? null : 0, t.secadoSeg),
    maillard: fase(t.secadoSeg, t.crackSeg),
    desarrollo: fase(t.crackSeg, t.descargaSeg),
  }
}

/**
 * Lecturas en orden, con aire y llama completos: si una lectura no los trae, siguen como en la anterior
 * (o como arrancó la tostión). Así la tabla y la gráfica muestran el valor vigente en cada minuto.
 */
export function lecturasCompletas(t: Pick<Tostion, 'lecturas' | 'aireInicial' | 'llamaInicial'>): Lectura[] {
  let aire = t.aireInicial
  let llama = t.llamaInicial
  return [...t.lecturas].sort((a, b) => a.segundo - b.segundo).map((l) => {
    aire = l.aire ?? aire
    llama = l.llama ?? llama
    return { ...l, aire, llama }
  })
}

/** Hasta qué minuto llega la curva: 12 como mínimo, más si hay datos después. */
export function minutoFinal(t: Pick<Tostion, 'lecturas' | 'descargaSeg'>, minimo = 12) {
  const ultimo = Math.max(0, t.descargaSeg ?? 0, ...t.lecturas.map((l) => l.segundo))
  return Math.max(minimo, Math.ceil(ultimo / 60))
}
