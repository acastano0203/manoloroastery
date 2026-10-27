import { rgb } from '../../lib/pdf'

// Colores de las series, en orden fijo y validados para daltonismo sobre blanco (los mismos de la curva de tostión).
// Tres quedan con poco contraste: por eso cada gráfica escribe sus valores y lleva leyenda.
export const SERIES = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'] as const

/** Una sola serie (barras de un solo color): el verde de la marca. */
export const UNICO = '#0F7A55'

export const pdfColor = (hex: string) => rgb(hex)
