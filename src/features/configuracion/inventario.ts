import { ALERTA_INVENTARIO } from './types'

export type NivelInventario = 'sin' | 'ok' | 'bajo' | 'agotado'

/** Cómo va un producto en el inventario de Siigo: sin inventario, bien, por agotarse (50 o menos) o agotado. */
export function nivel(quedan: number | null): NivelInventario {
  if (quedan === null) return 'sin'
  if (quedan <= 0) return 'agotado'
  return quedan <= ALERTA_INVENTARIO ? 'bajo' : 'ok'
}

/** "Quedan 42", "Agotado", "Faltan 3". */
export function quedanTxt(quedan: number) {
  if (quedan < 0) return `Faltan ${-quedan}`
  return quedan === 0 ? 'Agotado' : `Quedan ${quedan}`
}
