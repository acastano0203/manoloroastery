// Cálculos del módulo de reportes. Todo sale de los lotes que ya carga la app (sin consultas aparte).
import { fecha as fechaCorta } from '../../lib/format'
import { ETAPAS, pasaPorTrilla, yaEsta } from '../registros/etapas'
import { PROCESOS, type Etapa, type Proceso, type Registro } from '../registros/types'
import { calcularCobro, calcularMerma, calcularPerdidaTueste } from '../registros/utils'

const DIA = 86_400_000

/** Período del reporte, por la fecha en que se recibió el lote (YYYY-MM-DD, ambos incluidos). */
export interface Rango { desde: string; hasta: string }

export const RANGOS = [
  { id: '30', nombre: 'Últimos 30 días', dias: 30 },
  { id: '90', nombre: 'Últimos 3 meses', dias: 90 },
  { id: '365', nombre: 'Último año', dias: 365 },
  { id: 'todo', nombre: 'Todo', dias: null },
] as const
export type RangoId = (typeof RANGOS)[number]['id']

const isoDe = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const fechaDe = (iso: string) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d) }
/** Días enteros entre dos fechas YYYY-MM-DD. */
export const diasEntre = (desde: string, hasta: string) => Math.round((fechaDe(hasta).getTime() - fechaDe(desde).getTime()) / DIA)

export function rangoDe(id: RangoId, registros: Pick<Registro, 'fecha'>[], hoy: string): Rango {
  const r = RANGOS.find((x) => x.id === id)!
  if (r.dias === null) {
    const primera = registros.reduce((m, x) => (x.fecha < m ? x.fecha : m), hoy)
    return { desde: primera, hasta: hoy }
  }
  const d = fechaDe(hoy)
  d.setDate(d.getDate() - (r.dias - 1))
  return { desde: isoDe(d), hasta: hoy }
}

const enRango = (r: Pick<Registro, 'fecha'>, rango: Rango) => r.fecha >= rango.desde && r.fecha <= rango.hasta
const suma = <T>(xs: readonly T[], f: (x: T) => number) => xs.reduce((s, x) => s + f(x), 0)
const promedio = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)

/** Un lote sigue en la tostaduría hasta que se entrega. */
const enProceso = (r: Pick<Registro, 'etapa'>) => r.etapa !== 'Entregado'
/** Le falta tostar: está en Recibido o Trillado. */
const porTostar = (r: Pick<Registro, 'etapa'>) => !yaEsta(r, 'Tostado')

// ---------- totales del período ----------

export interface Totales {
  lotes: number
  /** Kilos recibidos (pergamino, natural, verde… tal como llegaron). */
  recibidosKg: number
  /** Kilos recibidos de los lotes que ya pasaron por la trilla. */
  trilladosKg: number
  /** Café en almendra que entró a tostar (se pesa al tostar). */
  almendraKg: number
  /** Café tostado (se pesa al empacar). */
  tostadoKg: number
  /** Lo cobrado por los lotes que ya se tostaron. */
  cobro: number
  mermaPct: number | null
  perdidaTuestePct: number | null
  /** Kilos tostados por cada 100 kilos recibidos, en los lotes que ya se empacaron. */
  rendimientoPct: number | null
}

export function totales(registros: readonly Registro[], rango: Rango): Totales {
  const xs = registros.filter((r) => enRango(r, rango))
  const tostados = xs.filter((r) => yaEsta(r, 'Tostado'))
  const empacados = xs.filter((r) => r.gramosTostado && r.kilos > 0)
  const recibidosEmpacados = suma(empacados, (r) => r.kilos)
  return {
    lotes: xs.length,
    recibidosKg: suma(xs, (r) => r.kilos),
    trilladosKg: suma(xs.filter((r) => pasaPorTrilla(r) && yaEsta(r, 'Trillado')), (r) => r.kilos),
    almendraKg: suma(xs, (r) => (r.gramos ?? 0) / 1000),
    tostadoKg: suma(xs, (r) => (r.gramosTostado ?? 0) / 1000),
    cobro: suma(tostados, (r) => calcularCobro(r, r.precios).total),
    mermaPct: promedio(xs.map(calcularMerma).filter((m): m is number => m !== null)),
    perdidaTuestePct: promedio(xs.map(calcularPerdidaTueste).filter((m): m is number => m !== null)),
    rendimientoPct: recibidosEmpacados ? (suma(empacados, (r) => r.gramosTostado! / 1000) / recibidosEmpacados) * 100 : null,
  }
}

// ---------- estado actual (no depende del período) ----------

export interface Pendiente {
  /** Lotes y kilos recibidos que todavía no se tuestan. */
  lotes: number
  kg: number
  /** De esos: pergamino por trillar y café ya en almendra (trillado o llegado en verde) por tostar. */
  porTrillar: { lotes: number; kg: number }
  enAlmendra: { lotes: number; kg: number }
  /** Días desde que se recibió el más viejo que falta por tostar. */
  masViejoDias: number | null
  /** Tostados que faltan por empacar y empacados que faltan por entregar. */
  porEmpacar: { lotes: number; kg: number }
  porEntregar: { lotes: number; kg: number }
}

export function pendiente(registros: readonly Registro[], hoy: string): Pendiente {
  const xs = registros.filter(porTostar)
  const grupo = (ys: readonly Registro[], kilos = (r: Registro) => r.kilos) => ({ lotes: ys.length, kg: suma(ys, kilos) })
  const porTrillar = xs.filter((r) => r.etapa === 'Recibido' && pasaPorTrilla(r))
  return {
    lotes: xs.length,
    kg: suma(xs, (r) => r.kilos),
    porTrillar: grupo(porTrillar),
    enAlmendra: grupo(xs.filter((r) => !porTrillar.includes(r))),
    masViejoDias: xs.length ? Math.max(...xs.map((r) => diasEntre(r.fecha, hoy))) : null,
    porEmpacar: grupo(registros.filter((r) => r.etapa === 'Tostado'), (r) => (r.gramos ?? 0) / 1000),
    porEntregar: grupo(registros.filter((r) => r.etapa === 'Empacado'), (r) => (r.gramosTostado ?? 0) / 1000),
  }
}

/** Una porción de una gráfica de torta o una barra. */
export interface Parte { clave: string; nombre: string; valor: number; detalle?: string }

/** Kilos recibidos de los lotes que siguen en la tostaduría, por etapa. */
export function inventarioPorEtapa(registros: readonly Registro[]): Parte[] {
  return ETAPAS.filter((e) => e !== 'Entregado').map((e) => {
    const ys = registros.filter((r) => r.etapa === e)
    return { clave: e, nombre: e, valor: suma(ys, (r) => r.kilos), detalle: `${ys.length} ${ys.length === 1 ? 'lote' : 'lotes'}` }
  })
}

/** Rangos de días desde que se recibió el lote (para ver qué tan atrasados vamos). */
export const TRAMOS_ATRASO = [
  { nombre: '0–2 días', hasta: 2 },
  { nombre: '3–5 días', hasta: 5 },
  { nombre: '6–10 días', hasta: 10 },
  { nombre: '11–20 días', hasta: 20 },
  { nombre: 'Más de 20', hasta: Infinity },
] as const

/** Lotes en proceso (sin entregar) según los días que llevan desde que se recibieron. */
export function atrasoPorTramo(registros: readonly Registro[], hoy: string): Parte[] {
  const xs = registros.filter(enProceso)
  return TRAMOS_ATRASO.map((t, i) => {
    const desde = i === 0 ? 0 : TRAMOS_ATRASO[i - 1].hasta + 1
    const ys = xs.filter((r) => { const d = diasEntre(r.fecha, hoy); return d >= desde && d <= t.hasta })
    return { clave: t.nombre, nombre: t.nombre, valor: ys.length, detalle: `${fmtKg(suma(ys, (r) => r.kilos))} kg` }
  })
}

export interface LoteAtrasado {
  id: string
  codigo: string
  cliente: string
  etapa: Etapa
  fecha: string
  kilos: number
  /** Días desde que se recibió. */
  dias: number
  /** Días que lleva en la etapa en que está (null si no se anotó cuándo llegó). */
  diasEnEtapa: number | null
}

/** Los lotes sin entregar que llevan más tiempo en la tostaduría, del más viejo al más nuevo. */
export function masAtrasados(registros: readonly Registro[], hoy: string, cuantos = 10): LoteAtrasado[] {
  return registros.filter(enProceso)
    .map((r) => {
      const llego = r.fechasEtapas[r.etapa]
      return {
        id: r.id, codigo: r.codigo, cliente: r.cliente, etapa: r.etapa, fecha: r.fecha, kilos: r.kilos,
        dias: diasEntre(r.fecha, hoy),
        diasEnEtapa: llego ? Math.max(0, diasEntre(isoDe(new Date(llego)), hoy)) : null,
      }
    })
    .sort((a, b) => b.dias - a.dias || a.fecha.localeCompare(b.fecha))
    .slice(0, cuantos)
}

// ---------- tiempos ----------

export const TRAMOS_TIEMPO: ReadonlyArray<{ clave: string; nombre: string; desde: Etapa; hasta: Etapa }> = [
  { clave: 'trilla', nombre: 'Recibido → Trillado', desde: 'Recibido', hasta: 'Trillado' },
  { clave: 'tueste', nombre: 'Trillado → Tostado', desde: 'Trillado', hasta: 'Tostado' },
  { clave: 'empaque', nombre: 'Tostado → Empacado', desde: 'Tostado', hasta: 'Empacado' },
  { clave: 'entrega', nombre: 'Empacado → Entregado', desde: 'Empacado', hasta: 'Entregado' },
]

const horasEntre = (a?: string, b?: string) => (a && b ? (new Date(b).getTime() - new Date(a).getTime()) / 3_600_000 : null)

/**
 * Horas promedio que tarda cada paso, con las horas que se anotan al pasar de etapa.
 * El café verde no se trilla: su Recibido → Tostado cuenta solo en "hasta tostar".
 */
export function tiemposPorEtapa(registros: readonly Registro[], rango: Rango) {
  const xs = registros.filter((r) => enRango(r, rango))
  const pasos: Parte[] = TRAMOS_TIEMPO.map((t) => {
    const hs = xs.map((r) => horasEntre(r.fechasEtapas[t.desde], r.fechasEtapas[t.hasta])).filter((h): h is number => h !== null && h >= 0)
    const p = promedio(hs)
    return { clave: t.clave, nombre: t.nombre, valor: p ?? 0, detalle: hs.length ? `${hs.length} ${hs.length === 1 ? 'lote' : 'lotes'}` : 'Sin datos' }
  })
  const hastaTostar = xs.map((r) => horasEntre(r.fechasEtapas.Recibido, r.fechasEtapas.Tostado)).filter((h): h is number => h !== null && h >= 0)
  const total = xs.map((r) => horasEntre(r.fechasEtapas.Recibido, r.fechasEtapas.Entregado)).filter((h): h is number => h !== null && h >= 0)
  return { pasos, hastaTostarHoras: promedio(hastaTostar), totalHoras: promedio(total) }
}

/** "5 h", "1,5 días". */
export function duracion(horas: number | null) {
  if (horas === null) return '—'
  if (horas < 24) return `${fmtNum(horas, horas < 10 ? 1 : 0)} h`
  const d = horas / 24
  return `${fmtNum(d, d < 10 ? 1 : 0)} ${d === 1 ? 'día' : 'días'}`
}

// ---------- en el tiempo ----------

export type Agrupacion = 'dia' | 'semana' | 'mes'

/** Por día hasta un mes, por semana hasta 4 meses, por mes si es más largo. */
export const agrupacionDe = (rango: Rango): Agrupacion => {
  const d = diasEntre(rango.desde, rango.hasta)
  return d <= 31 ? 'dia' : d <= 120 ? 'semana' : 'mes'
}

/** Inicio del grupo al que pertenece una fecha (YYYY-MM-DD): el mismo día, el lunes de esa semana o el día 1. */
function inicioGrupo(iso: string, g: Agrupacion) {
  const d = fechaDe(iso)
  if (g === 'semana') d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  if (g === 'mes') d.setDate(1)
  return isoDe(d)
}

function siguienteGrupo(iso: string, g: Agrupacion) {
  const d = fechaDe(iso)
  if (g === 'dia') d.setDate(d.getDate() + 1)
  else if (g === 'semana') d.setDate(d.getDate() + 7)
  else d.setMonth(d.getMonth() + 1)
  return isoDe(d)
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
export function etiquetaGrupo(iso: string, g: Agrupacion) {
  if (g === 'mes') { const [y, m] = iso.split('-'); return `${MESES[Number(m) - 1]} ${y.slice(2)}` }
  return fechaCorta(iso)
}

export interface Periodo { inicio: string; nombre: string; recibidoKg: number; tostadoKg: number; cobro: number; lotes: number }

/**
 * Kilos recibidos (por fecha de recibo) y kilos en almendra tostados (por el día en que se tostaron), por período.
 * Si se recibe más de lo que se tuesta, el atraso crece.
 */
export function porPeriodo(registros: readonly Registro[], rango: Rango): { agrupacion: Agrupacion; periodos: Periodo[] } {
  const g = agrupacionDe(rango)
  const periodos: Periodo[] = []
  const indice = new Map<string, Periodo>()
  for (let i = inicioGrupo(rango.desde, g); i <= rango.hasta; i = siguienteGrupo(i, g)) {
    const p = { inicio: i, nombre: etiquetaGrupo(i, g), recibidoKg: 0, tostadoKg: 0, cobro: 0, lotes: 0 }
    periodos.push(p)
    indice.set(i, p)
  }
  for (const r of registros) {
    if (enRango(r, rango)) {
      const p = indice.get(inicioGrupo(r.fecha, g))
      if (p) {
        p.recibidoKg += r.kilos
        p.lotes += 1
        if (yaEsta(r, 'Tostado')) p.cobro += calcularCobro(r, r.precios).total
      }
    }
    const tostado = r.fechasEtapas.Tostado
    if (tostado && r.gramos) {
      const dia = isoDe(new Date(tostado))
      if (dia >= rango.desde && dia <= rango.hasta) {
        const p = indice.get(inicioGrupo(dia, g))
        if (p) p.tostadoKg += r.gramos / 1000
      }
    }
  }
  return { agrupacion: g, periodos }
}

// ---------- composición ----------

/** Kilos recibidos por proceso en el período (sin los procesos que no llegaron). */
export function porProceso(registros: readonly Registro[], rango: Rango): Parte[] {
  const xs = registros.filter((r) => enRango(r, rango))
  return PROCESOS.map((p) => {
    const ys = xs.filter((r) => r.proceso === p)
    return { clave: p, nombre: p, valor: suma(ys, (r) => r.kilos), detalle: `${ys.length} ${ys.length === 1 ? 'lote' : 'lotes'}` }
  }).filter((p) => p.valor > 0)
}

/** Lotes empacados en grano o molidos en el período. */
export function porPresentacion(registros: readonly Registro[], rango: Rango): Parte[] {
  const xs = registros.filter((r) => enRango(r, rango) && r.presentacion)
  return (['Grano', 'Molido'] as const).map((p) => {
    const ys = xs.filter((r) => r.presentacion === p)
    return { clave: p, nombre: p === 'Grano' ? 'En grano' : 'Molido', valor: ys.length, detalle: `${fmtKg(suma(ys, (r) => (r.gramosTostado ?? 0) / 1000))} kg` }
  }).filter((p) => p.valor > 0)
}

export interface FilaProceso { proceso: Proceso; lotes: number; kg: number; mermaPct: number | null; perdidaTuestePct: number | null }

/** Rendimiento por proceso: cuánto se pierde en la trilla y en el tueste. */
export function rendimientoPorProceso(registros: readonly Registro[], rango: Rango): FilaProceso[] {
  const xs = registros.filter((r) => enRango(r, rango))
  return PROCESOS.map((p) => {
    const ys = xs.filter((r) => r.proceso === p)
    return {
      proceso: p, lotes: ys.length, kg: suma(ys, (r) => r.kilos),
      mermaPct: promedio(ys.map(calcularMerma).filter((m): m is number => m !== null)),
      perdidaTuestePct: promedio(ys.map(calcularPerdidaTueste).filter((m): m is number => m !== null)),
    }
  }).filter((f) => f.lotes > 0)
}

/** Clientes que más café trajeron en el período (kilos recibidos). */
export function topClientes(registros: readonly Registro[], rango: Rango, cuantos = 8): Parte[] {
  const m = new Map<string, Parte & { lotes: number }>()
  for (const r of registros) {
    if (!enRango(r, rango)) continue
    const c = m.get(r.clienteId) ?? { clave: r.clienteId, nombre: r.cliente, valor: 0, lotes: 0 }
    c.valor += r.kilos
    c.lotes += 1
    m.set(r.clienteId, c)
  }
  return [...m.values()].sort((a, b) => b.valor - a.valor).slice(0, cuantos)
    .map(({ lotes, ...c }) => ({ ...c, detalle: `${lotes} ${lotes === 1 ? 'lote' : 'lotes'}` }))
}

// ---------- formato ----------

export const fmtNum = (n: number, d = 1) => {
  const [e, f] = n.toFixed(d).split('.')
  return e.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (f && Number(f) ? ',' + f : '')
}
/** Kilos con un decimal (sin ",0"). */
export const fmtKg = (n: number) => fmtNum(n, 1)
