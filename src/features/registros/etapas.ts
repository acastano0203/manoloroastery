import type { Etapa, Registro } from './types'

export const ETAPAS: readonly Etapa[] = ['Recibido', 'Trillado', 'Tostado', 'Empacado', 'Entregado']

/** Lo que se hace para llegar a cada etapa (texto del botón "Siguiente paso"). */
export const PASO: Record<Etapa, string> = {
  Recibido: 'Recibir',
  Trillado: 'Trillar',
  Tostado: 'Tostar',
  Empacado: 'Empacar',
  Entregado: 'Entregar',
}

type ConLlegada = Pick<Registro, 'llegada'>

/** El café verde no se trilla. Sin dato (registros viejos) se toma como pergamino. */
export const pasaPorTrilla = (r: ConLlegada) => r.llegada !== 'Verde'

/** Etapas por las que pasa este lote. */
export const etapasDe = (r: ConLlegada): Etapa[] => ETAPAS.filter((e) => e !== 'Trillado' || pasaPorTrilla(r))

const pos = (e: Etapa) => ETAPAS.indexOf(e)

/** La etapa que sigue, o null si ya se entregó. */
export function siguienteEtapa(r: ConLlegada & Pick<Registro, 'etapa'>): Etapa | null {
  return etapasDe(r).find((e) => pos(e) > pos(r.etapa)) ?? null
}

/** La etapa anterior, o null si está en Recibido. */
export function etapaAnterior(r: ConLlegada & Pick<Registro, 'etapa'>): Etapa | null {
  return etapasDe(r).filter((e) => pos(e) < pos(r.etapa)).at(-1) ?? null
}

/** Qué pasa al soltar el lote en esa etapa del tablero: solo se mueve un paso, como con los botones. */
export function movimientoA(r: ConLlegada & Pick<Registro, 'etapa'>, etapa: Etapa): 'avanzar' | 'regresar' | null {
  if (etapa === siguienteEtapa(r)) return 'avanzar'
  if (etapa === etapaAnterior(r)) return 'regresar'
  return null
}

/** Si el lote ya llegó (o pasó) a esa etapa. */
export const yaEsta = (r: Pick<Registro, 'etapa'>, etapa: Etapa) => pos(r.etapa) >= pos(etapa)

/** La remisión, el WhatsApp y el envío a contabilidad se hacen al entregar. */
export const estaEntregado = (r: Pick<Registro, 'etapa'>) => r.etapa === 'Entregado'
