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

/** Cuando quedan estas o menos en Siigo, la bolsa se marca por agotarse. */
export const ALERTA_INVENTARIO = 50

/**
 * Lo fijo de Siigo para la cotización de cada lote (la Edge Function "siigo" lo lee de la base):
 * el servicio de torrefacción y el cliente. Las bolsas no: se eligen en el lote de los productos de Siigo.
 */
export interface AjustesSiigo {
  /** Código del servicio de torrefacción en Siigo (por libra). */
  tostion: string
  /** Comprobante de cotización y vendedor: null = el único activo en Siigo. */
  cotizacionId: number | null
  vendedorId: number | null
  /** Identificación del cliente para las ventas sin factura a nombre propio. */
  consumidorFinal: string
  /** Si el cliente no existe en Siigo, se crea con esta dirección y ciudad (códigos DANE). */
  crearClientes: boolean
  direccion: string
  departamento: string
  ciudad: string
}

export interface Configuracion {
  id: string
  /** Precio por libra (lb). Los de bolsas (p340…pDrip) son de los lotes de antes: ya no se editan. */
  precios: Precios
  siigo: AjustesSiigo
}

export type EstadoConexion = 'sin' | 'probando' | 'ok' | 'error'
