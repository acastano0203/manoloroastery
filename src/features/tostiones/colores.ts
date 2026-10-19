import { rgb } from '../../lib/pdf'

// Colores de las series de la curva, validados para daltonismo sobre fondo blanco
// (grano/tambor y aire/llama son pares distintos: van en gráficas separadas).
const hex = { grano: '#eb6834', tambor: '#2a78d6', aire: '#1baf7a', llama: '#4a3aa7' } as const

export const COLORES = Object.fromEntries(
  Object.entries(hex).map(([k, v]) => [k, { hex: v, pdf: rgb(v) }]),
) as Record<keyof typeof hex, { hex: string; pdf: string }>
