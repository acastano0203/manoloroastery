import { rgb } from '../../lib/pdf'

// Colores de las series de la curva, validados para daltonismo sobre fondo blanco
// (el grano va en la curva de temperatura; aire y llama, en la gráfica de abajo).
const hex = { grano: '#eb6834', aire: '#1baf7a', llama: '#4a3aa7' } as const

export const COLORES = Object.fromEntries(
  Object.entries(hex).map(([k, v]) => [k, { hex: v, pdf: rgb(v) }]),
) as Record<keyof typeof hex, { hex: string; pdf: string }>
