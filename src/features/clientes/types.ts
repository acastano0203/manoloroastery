import type { Database } from '../../types/database'

export type TipoDoc = Database['public']['Enums']['tipo_documento']
export const TIPOS_DOC: readonly TipoDoc[] = ['CC', 'NIT']

export interface DatosFactura {
  factura: boolean
  tipoDoc: TipoDoc
  numDoc: string
  correo: string
}

export interface ClienteDatos extends DatosFactura {
  nombre: string
  /** 10 dígitos, sin +57. */
  celular: string
}

export interface Cliente extends ClienteDatos {
  id: string
  codigo: string
}
