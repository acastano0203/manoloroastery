// Arma la cotización de Siigo a partir de un lote. Sin dependencias: lo usa la Edge Function "siigo"
// y lo prueban los tests de la app (src/features/configuracion/siigoVenta.test.ts).
// Es una cotización, no una factura: la contadora la revisa en Siigo y la pasa a factura con «Facturar».
// No lleva medio de pago (la cotización no lo tiene): la forma de pago va escrita en la descripción.

export type FormaPago = 'Efectivo' | 'Banco' | 'Bold'

/** Bolsa o drip del lote: un producto de Siigo con la cantidad y el precio con que se eligió. */
export interface BolsaLote {
  codigo: string
  nombre: string
  cantidad: number
  precio: number
}

/** Ajustes de Siigo (Configuración › Siigo, en public.configuracion). */
export interface AjustesSiigo {
  /** Comprobante de cotización. null: el único activo en Siigo. */
  documentoId: number | null
  /** Vendedor. null: el único activo en Siigo. */
  vendedorId: number | null
  /** Código del servicio de torrefacción en Siigo (por libra). */
  tostion: string
  /** Identificación del cliente para las ventas sin factura a nombre propio. */
  consumidorFinal: string
  /** Si el cliente no existe en Siigo, se crea con esta dirección y ciudad (la app no las pide). */
  crearClientes: boolean
  direccion: string
  /** Códigos DANE: departamento (2 dígitos) y ciudad (5 dígitos). */
  departamento: string
  ciudad: string
}

/** Columnas de public.configuracion que usa Siigo. */
export interface FilaAjustesSiigo {
  siigo_producto_tostion: string
  siigo_cotizacion_id: number | null
  siigo_vendedor_id: number | null
  siigo_consumidor_final: string
  siigo_crear_clientes: boolean
  siigo_direccion: string
  siigo_departamento: string
  siigo_ciudad: string
}

const CONSUMIDOR_FINAL = '222222222222'

/** Lee los ajustes de la fila de configuración. */
export function ajustesDeConfig(f: Partial<FilaAjustesSiigo> | null | undefined): AjustesSiigo {
  const txt = (v: string | null | undefined) => (v ?? '').trim()
  const num = (v: number | null | undefined) => (Number.isInteger(v) && (v as number) > 0 ? (v as number) : null)
  return {
    documentoId: num(f?.siigo_cotizacion_id),
    vendedorId: num(f?.siigo_vendedor_id),
    tostion: txt(f?.siigo_producto_tostion) || 'STORRE',
    consumidorFinal: txt(f?.siigo_consumidor_final) || CONSUMIDOR_FINAL,
    crearClientes: f?.siigo_crear_clientes ?? true,
    direccion: txt(f?.siigo_direccion),
    departamento: txt(f?.siigo_departamento),
    ciudad: txt(f?.siigo_ciudad),
  }
}

/** Lo que se necesita del lote (columnas de public.lotes). */
export interface LoteVenta {
  id: string
  codigo: string
  proceso: string
  /** Datos del cliente copiados en el lote. */
  cliente: string
  celular: string
  correo: string
  tipo_doc: 'CC' | 'NIT'
  factura: boolean
  num_doc: string
  pago: FormaPago | null
  etapa: string
  gramos: number | null
  gramos_tostado: number | null
  precio_lb: number
  /** Bolsas y drips de Siigo. */
  bolsas: BolsaLote[] | null
  /** Bolsas de los lotes de antes (sin producto de Siigo). */
  n340: number
  n500: number
  n2500: number
  n_drip: number
  bolsas_cliente: boolean
  reabierto_at: string | null
}

/** Siigo acepta máximo 2 decimales en la cantidad. */
export const redondear2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

/** Libras de tostión, como en el cobro de la app: gramos tostados (o en almendra si falta) ÷ 500, a 2 decimales. */
export function librasDelLote(l: Pick<LoteVenta, 'gramos' | 'gramos_tostado'>): number {
  const g = l.gramos_tostado && l.gramos_tostado > 0 ? l.gramos_tostado : l.gramos && l.gramos > 0 ? l.gramos : 0
  return redondear2(g / 500)
}

/** Fecha de hoy en Colombia (yyyy-MM-dd). */
export function hoyColombia(ahora = new Date()): string {
  return new Date(ahora.getTime() - 5 * 3600_000).toISOString().slice(0, 10)
}

/** Llave de idempotencia (máx. 30 alfanuméricos): la misma para el mismo lote, otra si se reabrió. */
export function llaveIdempotencia(l: Pick<LoteVenta, 'id' | 'reabierto_at'>): string {
  const base = l.id.replace(/[^a-zA-Z0-9]/g, '').slice(0, 20)
  const version = l.reabierto_at ? new Date(l.reabierto_at).getTime().toString(36) : '0'
  return (base + 'v' + version).slice(0, 30)
}

export interface ItemSiigo {
  code: string
  description: string
  quantity: number
  price: number
}

/** Cuerpo de POST /v1/quotations. */
export interface CotizacionSiigo {
  document: { id: number }
  date: string
  customer: { identification: string; branch_office: number }
  seller: number
  items: ItemSiigo[]
}

export interface Venta {
  cotizacion: CotizacionSiigo
  total: number
}

/** Identificación del cliente en Siigo: sin puntos, espacios ni dígito de verificación (900123456-7 → 900123456). */
export const identificacion = (doc: string) => doc.replace(/[\s.]/g, '').split('-')[0].replace(/\D/g, '')

/**
 * Arma la cotización: el servicio de torrefacción por libras y cada bolsa o drip de Siigo del lote.
 * Lanza un Error con un texto para el equipo si falta algo: así no se le manda a Siigo algo que va a rechazar
 * (muchos errores bloquean el usuario API). Comprobante y vendedor ya vienen resueltos.
 * @param reemplaza nombre de una cotización anterior del mismo lote, si esta la reemplaza.
 */
export function armarCotizacion(
  l: LoteVenta, a: AjustesSiigo & { documentoId: number; vendedorId: number }, fecha = hoyColombia(), reemplaza?: string | null,
): Venta {
  if (!a.tostion) throw new Error('Falta el código del servicio de torrefacción en Siigo (Configuración › Siigo).')
  if (l.etapa !== 'Entregado') throw new Error('Solo se envían a Siigo los lotes entregados.')
  if (!l.pago) throw new Error('El lote no tiene forma de pago. Edítalo y elige una.')
  // Los lotes de antes anotaban las bolsas por tamaño, sin producto de Siigo.
  const viejas = (l.bolsas_cliente ? 0 : l.n340 + l.n500 + l.n2500) + l.n_drip
  if (viejas > 0) throw new Error('Las bolsas de este lote son de antes de la conexión con Siigo. Edítalo y elígelas otra vez de la lista de Siigo.')

  const cliente = l.factura ? identificacion(l.num_doc) : identificacion(a.consumidorFinal)
  if (!cliente) throw new Error(l.factura ? 'Falta el número de documento para la factura.' : 'Falta la identificación de consumidor final.')

  const libras = librasDelLote(l)
  if (libras <= 0) throw new Error('El lote no tiene peso tostado: no hay libras para cotizar.')

  // La cotización no tiene observaciones ni medio de pago: van en la descripción de la torrefacción para la contadora.
  const nota = [`Torrefacción lote ${l.codigo}`, l.proceso, `${libras} lb`, `Pago: ${l.pago}`, reemplaza ? `Reemplaza ${reemplaza}` : '']
    .filter(Boolean).join(' · ')
  const items: ItemSiigo[] = [{ code: a.tostion, description: nota, quantity: libras, price: l.precio_lb }]
  for (const b of l.bolsas ?? []) {
    if (!b.codigo || !(b.cantidad > 0)) continue
    items.push({ code: b.codigo, description: b.nombre, quantity: b.cantidad, price: b.precio })
  }

  const total = redondear2(items.reduce((s, i) => s + i.quantity * i.price, 0))
  return {
    total,
    cotizacion: {
      document: { id: a.documentoId },
      date: fecha,
      customer: { identification: cliente, branch_office: 0 },
      seller: a.vendedorId,
      items,
    },
  }
}

// ---------- productos de Siigo para elegir bolsas ----------

/** Producto de Siigo tal como llega de GET /v1/products (solo lo que se usa). */
export interface ProductoSiigoApi {
  code: string
  name: string
  active?: boolean
  stock_control?: boolean
  available_quantity?: number
  prices?: Array<{ currency_code?: string; price_list?: Array<{ position?: number; value?: number }> }>
}

/** Producto para la lista de bolsas: código, nombre, primer precio de venta y cuántas hay en Siigo. */
export interface ProductoBolsa {
  codigo: string
  nombre: string
  precio: number
  disponible: number
}

/** Productos con inventario y activos, con su precio de venta (lista 1). */
export function productosParaBolsas(lista: ProductoSiigoApi[]): ProductoBolsa[] {
  return lista
    .filter((p) => p.active !== false && p.stock_control)
    .map((p) => {
      const listas = p.prices?.find((x) => !x.currency_code || x.currency_code === 'COP')?.price_list ?? []
      const precio = (listas.find((x) => x.position === 1) ?? listas[0])?.value ?? 0
      return { codigo: p.code, nombre: p.name, precio: Number(precio) || 0, disponible: Number(p.available_quantity ?? 0) }
    })
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
}

// ---------- cliente nuevo en Siigo ----------

/** Dígito de verificación del NIT (algoritmo de la DIAN). */
export function digitoVerificacion(nit: string): string {
  const pesos = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71]
  const d = nit.replace(/\D/g, '').split('').reverse()
  const suma = d.reduce((s, c, i) => s + Number(c) * pesos[i], 0)
  const r = suma % 11
  return String(r > 1 ? 11 - r : r)
}

/** Cuerpo de POST /v1/customers. */
export interface ClienteSiigo {
  type: 'Customer'
  person_type: 'Person' | 'Company'
  id_type: '13' | '31'
  identification: string
  check_digit?: string
  name: string[]
  vat_responsible: boolean
  fiscal_responsibilities: Array<{ code: string }>
  address: { address: string; city: { country_code: string; state_code: string; city_code: string } }
  phones: Array<{ number: string }>
  contacts: Array<{ first_name: string; last_name: string; email: string }>
  comments: string
}

/** Persona: [nombres, apellidos]. Con 4 palabras o más, dos y dos; si no, la primera y el resto. */
export function partirNombre(nombre: string): [string, string] | null {
  const p = nombre.trim().split(/\s+/).filter(Boolean)
  if (p.length < 2) return null
  const n = p.length >= 4 ? 2 : 1
  return [p.slice(0, n).join(' '), p.slice(n).join(' ')]
}

/**
 * Arma el cliente para crearlo en Siigo cuando no existe (solo lotes con factura a nombre propio).
 * Siigo exige dirección y ciudad; la app no las pide, así que van las de Configuración › Siigo.
 * Lanza un Error con un texto para el equipo si falta algo.
 */
export function armarCliente(l: Pick<LoteVenta, 'codigo' | 'cliente' | 'celular' | 'correo' | 'tipo_doc' | 'num_doc'>, a: AjustesSiigo): ClienteSiigo {
  if (!a.direccion || !/^\d{2}$/.test(a.departamento) || !/^\d{5}$/.test(a.ciudad)) {
    throw new Error('Para crear clientes en Siigo falta la dirección, el departamento o la ciudad (Configuración › Siigo).')
  }
  const id = identificacion(l.num_doc)
  const empresa = l.tipo_doc === 'NIT'
  let name: string[]
  if (empresa) {
    name = [l.cliente.trim().slice(0, 100)]
  } else {
    const partes = partirNombre(l.cliente)
    if (!partes) throw new Error(`Para crear el cliente en Siigo hace falta nombre y apellido («${l.cliente}»). Corrige el nombre del cliente y reenvía.`)
    name = partes.map((s) => s.slice(0, 100))
  }
  const contacto = partirNombre(l.cliente) ?? [l.cliente.trim(), '']
  return {
    type: 'Customer',
    person_type: empresa ? 'Company' : 'Person',
    id_type: empresa ? '31' : '13',
    identification: id,
    ...(empresa ? { check_digit: digitoVerificacion(id) } : {}),
    name,
    vat_responsible: false,
    fiscal_responsibilities: [{ code: 'R-99-PN' }],
    address: { address: a.direccion, city: { country_code: 'Co', state_code: a.departamento, city_code: a.ciudad } },
    phones: l.celular ? [{ number: l.celular }] : [],
    contacts: l.correo ? [{ first_name: contacto[0].slice(0, 50), last_name: contacto[1].slice(0, 50), email: l.correo.trim() }] : [],
    comments: `Creado desde el registro de tostión (lote ${l.codigo}). Revisar dirección y responsabilidades fiscales.`,
  }
}
