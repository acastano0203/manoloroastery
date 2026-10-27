/** Posiciones del aire del tostador, en %. */
export const AIRES = [0, 25, 50, 75, 100] as const
export type Aire = (typeof AIRES)[number]

/** Atajos de llama (gas), en %. Se puede escribir cualquier valor de 0 a 100. */
export const LLAMAS = [100, 75, 50, 30, 0] as const

/** Una tostión se registra hasta el minuto 30, aunque normalmente dura hasta 12. */
export const MINUTO_MAXIMO = 30
export const MINUTOS_NORMALES = 12

export type Origen = 'manual' | 'automatica'

/** Lectura de un momento de la tostión. Aire y llama vacíos = siguen como estaban. */
export interface Lectura {
  id: string
  segundo: number
  tempGrano: number | null
  tempTambor: number | null
  aire: number | null
  llama: number | null
}

/** Una tostión (bache) de un lote, con su curva. */
export interface Tostion {
  id: string
  loteId: string
  origen: Origen
  gramosVerde: number
  /** Temperatura a la que entra el café (carga), en °C. */
  tempCarga: number | null
  aireInicial: number | null
  llamaInicial: number | null
  /** Cuándo arrancó el cronómetro. */
  iniciadaAt: string | null
  /** Segundos desde la carga. Fin de secado: cuando el grano se pone amarillo. */
  secadoSeg: number | null
  crackSeg: number | null
  descargaSeg: number | null
  notas: string | null
  /** Ruta del PDF en la carpeta "lotes" (curva automática). */
  archivo: string | null
  creadaAt: string
  lecturas: Lectura[]
}

export type CambiosTostion = Partial<Pick<Tostion,
  'gramosVerde' | 'tempCarga' | 'aireInicial' | 'llamaInicial' | 'iniciadaAt' | 'secadoSeg' | 'crackSeg' | 'descargaSeg' | 'notas'>>
