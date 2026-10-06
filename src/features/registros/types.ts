import type { AlertKind } from '../../components/ui/Alert'
import type { Database } from '../../types/database'
import type { DatosFactura } from '../clientes/types'
import type { Precios } from '../configuracion/types'

type Enums = Database['public']['Enums']
export type Estado = Enums['estado_envio']
export type Pago = Enums['forma_pago']
export type Proceso = Enums['proceso_cafe']
export type Etapa = Enums['etapa_lote']
export type Llegada = Enums['llegada_cafe']

export const PAGOS: readonly Pago[] = ['Efectivo', 'Banco', 'Bold']
export const PROCESOS: readonly Proceso[] = ['Pergamino', 'Natural', 'Honey', 'Cofermentado']

export interface CantidadBolsas {
  n340: number
  n500: number
  n2500: number
}

export interface RegistroDatos extends CantidadBolsas, DatosFactura {
  clienteId: string
  /** YYYY-MM-DD */
  fecha: string
  cliente: string
  celular: string
  /** Forma de pago de los registros viejos; los abonos nuevos van en la tabla pagos. */
  pago: Pago | null
  proceso: Proceso
  kilos: number
  gramos: number
}

export interface Registro extends RegistroDatos {
  id: string
  codigo: string
  /** Estado de envío a contabilidad (Siigo), aparte de la etapa del lote. */
  estado: Estado
  etapa: Etapa
  /** Pergamino pasa por trilla; Verde se la salta. Vacío en registros viejos. */
  llegada: Llegada | null
  /** Precios con los que se cobró este registro. */
  precios: Precios
}

export interface Aviso {
  kind: AlertKind
  text: string
  /** Si viene, el aviso muestra el botón "Ver remisión". */
  registroId?: string
  /** Si viene, el aviso muestra el botón "Deshacer" que regresa el lote a esa etapa. */
  deshacer?: { id: string; etapa: Etapa }
}

/** Resultado de calcular el cobro de un registro. */
export interface Cobro {
  libras: number
  tostion: number
  bolsas: number
  total: number
  nb: number
  librasTxt: string
  tostionTxt: string
  bolsasTxt: string
  totalTxt: string
  fLibras: string
  fTostion: string
  fBolsas: string
  fTotal: string
}
