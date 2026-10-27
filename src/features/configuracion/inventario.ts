import { BOLSAS } from '../registros/utils'
import { ALERTA_INVENTARIO, type Inventario } from './types'

export type NivelInventario = 'sin' | 'ok' | 'bajo' | 'agotado'

/** Cómo va un producto: sin inventario, bien, por agotarse (50 o menos) o agotado. */
export function nivel(quedan: number | null): NivelInventario {
  if (quedan === null) return 'sin'
  if (quedan <= 0) return 'agotado'
  return quedan <= ALERTA_INVENTARIO ? 'bajo' : 'ok'
}

export interface AlertaInventario { n: keyof Inventario; nombre: string; quedan: number; nivel: 'bajo' | 'agotado' }

/** Los productos que se están acabando (50 o menos) o ya se acabaron. */
export function alertasInventario(inv: Inventario | null | undefined): AlertaInventario[] {
  if (!inv) return []
  return BOLSAS.flatMap((b) => {
    const quedan = inv[b.n]
    const n = nivel(quedan)
    return n === 'bajo' || n === 'agotado' ? [{ n: b.n, nombre: b.plural, quedan: quedan!, nivel: n }] : []
  })
}

/** "Quedan 42", "Agotado", "Faltan 3" (si se usaron más de las contadas). */
export function quedanTxt(quedan: number) {
  if (quedan < 0) return `Faltan ${-quedan}`
  return quedan === 0 ? 'Agotado' : `Quedan ${quedan}`
}
