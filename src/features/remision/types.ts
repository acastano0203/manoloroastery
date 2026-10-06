import type { Cobro } from '../registros/types'

export interface LineaRemision {
  concepto: string
  detalle: string
  valor: string
}

/** Todo lo que se imprime en la remisión, ya formateado. */
export interface DatosRemision {
  codigo: string
  fechaLarga: string
  cliente: string
  celularTxt: string
  proceso: string
  kilosTxt: string
  gramosTxt: string
  pago: string
  cobro: Cobro
  lineas: LineaRemision[]
}
