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
export type Presentacion = Enums['presentacion']
export type Molienda = Enums['molienda']

export const PAGOS: readonly Pago[] = ['Efectivo', 'Banco', 'Bold']
export const PRESENTACIONES: readonly Presentacion[] = ['Grano', 'Molido']
export const MOLIENDAS: readonly Molienda[] = ['Fino', 'Medio', 'Grueso']
export const PROCESOS: readonly Proceso[] = ['Pergamino', 'Natural', 'Honey', 'Cofermentado', 'En almendra (en verde)']

export interface CantidadBolsas {
  n340: number
  n500: number
  n2500: number
  /** Drips (sobres de café filtrado), por unidad. */
  nDrip: number
}

/** Lo que se anota al empacar. */
export interface Empaque extends CantidadBolsas {
  /** Sin bolsa: el cliente trae las suyas (no se cobran bolsas). */
  bolsasCliente: boolean
  /** Peso del café tostado, para la pérdida en el tueste. Vacío hasta empacar. */
  gramosTostado: number | null
  /** Café tostado que no cupo en las bolsas y se entrega suelto, en gramos. Ya se cobra en la tostión. */
  gramosSobrante: number | null
}

export interface RegistroDatos extends Empaque, DatosFactura {
  /** Nombre del lote que trae el cliente desde la finca. Vacío: la base asigna el consecutivo (L-0013). */
  codigo: string
  clienteId: string
  /** YYYY-MM-DD */
  fecha: string
  cliente: string
  celular: string
  /** Forma de pago de los registros viejos; los abonos nuevos van en la tabla pagos. */
  pago: Pago | null
  proceso: Proceso
  kilos: number
  /** Humedad del café al recibirlo, en %. Opcional. */
  humedad: number | null
  /** Densidad del grano al recibirlo, en g/L. Opcional. */
  densidad: number | null
  /** Café a tostar. Se anota al tostar: vacío mientras el lote está en Recibido o Trillado. */
  gramos: number | null
}

export interface Registro extends RegistroDatos {
  id: string
  /** Estado de envío a contabilidad (Siigo), aparte de la etapa del lote. */
  estado: Estado
  etapa: Etapa
  /** Pergamino pasa por trilla; Verde se la salta. Vacío en registros viejos. */
  llegada: Llegada | null
  /** Precios con los que se cobró este registro. */
  precios: Precios
  /** Cuándo se entregó (null si todavía no). */
  entregadoAt: string | null
  /** Última vez que se reabrió desde el historial (ya se había enviado a contabilidad). */
  reabiertoAt: string | null
  /** Café que el cliente dejó guardado en la tostadora al entregar. null = no requiere almacenamiento. */
  almacenamiento: Almacenamiento | null
  /** Descripción que se anota en cada etapa (cómo salió la trilla, observaciones de la tostión…). */
  descripciones: Descripciones
  /** Fecha y hora (ISO) en que llegó a cada etapa. Las de etapas que se deshicieron no están. */
  fechasEtapas: Partial<Record<Etapa, string>>
  /** En grano o molido: se pregunta al empacar. Vacío en lotes empacados antes. */
  presentacion: Presentacion | null
  /** Solo si es molido. */
  molienda: Molienda | null
}

export type Descripciones = Partial<Record<Etapa, string>>

/** Almacenamiento al entregar: 1 a 10 días, cuánto se guarda, cómo va marcado y la foto de evidencia. */
export interface Almacenamiento {
  dias: number
  /** Cantidad en gramos (para compararla con el peso tostado). */
  gramos: number
  /** Unidad en la que se anotó y se muestra. */
  unidad: Unidad
  marcado: string
  /** Ruta de la foto en la carpeta "lotes". */
  foto: string
}

/** Unidades para anotar una cantidad. La libra es de 500 g, como en el cobro. */
export type Unidad = 'g' | 'kg' | 'lb'
export const UNIDADES: ReadonlyArray<{ u: Unidad; nombre: string; gramos: number }> = [
  { u: 'g', nombre: 'Gramos', gramos: 1 },
  { u: 'kg', nombre: 'Kilos', gramos: 1000 },
  { u: 'lb', nombre: 'Libras', gramos: 500 },
]

/** Días máximos de almacenamiento. */
export const ALMACEN_DIAS_MAX = 10

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
  /** Con qué peso salió la tostión: el tostado (desde que se empaca) o la almendra (estimado antes de empacar). */
  base: 'tostado' | 'almendra'
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
