/** Precios en pesos colombianos. */
export interface Precios {
  /** Precio por libra de tostión. */
  lb: number
  p340: number
  p500: number
  p2500: number
  /** Precio por drip (unidad). */
  pDrip: number
}

/** Bolsas y drips en bodega, con las mismas llaves de los lotes. null = no se lleva inventario. */
export type Inventario = Record<'n340' | 'n500' | 'n2500' | 'nDrip', number | null>

/** Cuando quedan estas o menos, se avisa para comprar más. */
export const ALERTA_INVENTARIO = 50

export interface Configuracion {
  id: string
  precios: Precios
  /** Lo descuenta la base al registrar bolsas en los lotes; aquí solo se lee. Se corrige con ajustarInventario. */
  inventario: Inventario
  siigoUsuario: string
}

export type EstadoConexion = 'sin' | 'probando' | 'ok' | 'error'
