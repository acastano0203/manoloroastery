/** Precios en pesos colombianos. */
export interface Precios {
  /** Precio por libra de tostión. */
  lb: number
  p340: number
  p500: number
  p2500: number
}

export interface Configuracion {
  id: string
  precios: Precios
  siigoUsuario: string
}

export type EstadoConexion = 'sin' | 'probando' | 'ok' | 'error'
