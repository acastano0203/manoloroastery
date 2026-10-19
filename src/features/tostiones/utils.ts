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

/** Tiempo de desarrollo (del primer crack a la descarga), total y DTR (% del tiempo total en desarrollo). */
export function resumenTiempos(t: Pick<Tostion, 'crackSeg' | 'descargaSeg'>) {
  const total = t.descargaSeg
  const desarrollo = t.crackSeg !== null && t.descargaSeg !== null ? t.descargaSeg - t.crackSeg : null
  const dtr = desarrollo !== null && total ? (desarrollo / total) * 100 : null
  return { total, desarrollo, dtr }
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
