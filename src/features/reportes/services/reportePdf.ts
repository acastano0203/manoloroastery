// Reporte de la tostaduría en PDF (A4, 595×842 pt, varias páginas): lo mismo que la pantalla de Reportes.
import { dec, fecha, money } from '../../../lib/format'
import { ancho, armarPdf, escapar, rgb } from '../../../lib/pdf'
import { NEGOCIO } from '../../remision/negocio'
import { SERIES, UNICO } from '../colores'
import {
  duracion, fmtKg, fmtNum, type FilaProceso, type LoteAtrasado, type Parte, type Pendiente, type Periodo, type Rango, type Totales,
} from '../reportes'

const W = 595, H = 842, L = 40, R = 555
const oscuro = rgb('#122620'), gris = rgb('#52665A'), esmeralda = rgb('#0B5E42'), linea = rgb('#D9E5DB'), fondo = rgb('#EAF3EC')

const T = (x: number, y: number, s: string, size: number, bold = false, color = oscuro) =>
  `${color} rg BT /${bold ? 'F2' : 'F1'} ${size} Tf ${x.toFixed(1)} ${y.toFixed(1)} Td (${escapar(s)}) Tj ET\n`
const TR = (xr: number, y: number, s: string, size: number, bold = false, color = oscuro) => T(xr - ancho(s, size, bold), y, s, size, bold, color)
const TC = (xc: number, y: number, s: string, size: number, bold = false, color = oscuro) => T(xc - ancho(s, size, bold) / 2, y, s, size, bold, color)
const raya = (x1: number, y1: number, x2: number, y2: number, color = linea, w = 0.5) =>
  `${color} RG ${w} w ${x1.toFixed(1)} ${y1.toFixed(1)} m ${x2.toFixed(1)} ${y2.toFixed(1)} l S\n`
const caja = (x: number, y: number, w: number, h: number, color: string) => `${color} rg ${x.toFixed(1)} ${y.toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)} re f\n`
const borde = (x: number, y: number, w: number, h: number, color = linea) => `${color} RG 0.8 w ${x.toFixed(1)} ${y.toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)} re S\n`
/** Recorta un texto para que quepa en un ancho. */
const cabe = (s: string, max: number, size: number, bold = false) => {
  if (ancho(s, size, bold) <= max) return s
  let t = s
  while (t.length > 1 && ancho(t + '…', size, bold) > max) t = t.slice(0, -1)
  return t + '…'
}

const kgTxt = (v: number) => `${fmtKg(v)} kg`
const lotesTxt = (v: number) => `${v} ${v === 1 ? 'lote' : 'lotes'}`
const pctTxt = (v: number | null) => (v === null ? '—' : `${dec(v, 1)} %`)
const pctDe = (v: number, total: number) => (total ? `${dec((v / total) * 100, 0)} %` : '0 %')

export interface DatosReporte {
  hoy: string
  nombreRango: string
  rango: Rango
  totales: Totales
  pendiente: Pendiente
  inventario: Parte[]
  atraso: Parte[]
  atrasados: LoteAtrasado[]
  tiempos: { pasos: Parte[]; hastaTostarHoras: number | null; totalHoras: number | null }
  periodo: { agrupacion: string; periodos: Periodo[] }
  procesos: Parte[]
  presentacion: Parte[]
  rendimiento: FilaProceso[]
  clientes: Parte[]
}

export function construirReporte(d: DatosReporte): Uint8Array<ArrayBuffer> {
  const paginas: string[] = []
  let o = ''
  let y = 0

  function encabezado() {
    o += T(L, 800, NEGOCIO.nombre, 14, true, esmeralda)
    o += T(L, 785, `NIT ${NEGOCIO.nit} · ${NEGOCIO.ciudad}`, 8.5, false, gris)
    o += TR(R, 803, 'REPORTE DE LA TOSTADURÍA', 7.5, true, gris)
    o += TR(R, 786, fecha(d.hoy, true), 14, true)
    o += TR(R, 772, `${d.nombreRango}: ${fecha(d.rango.desde, true)} a ${fecha(d.rango.hasta, true)}`, 8.5, false, gris)
    o += raya(L, 762, R, 762, esmeralda, 1.4)
    y = 740
  }
  function nuevaPagina() {
    if (o) paginas.push(o + TC(W / 2, 22, `Página ${paginas.length + 1}`, 7.5, false, gris))
    o = ''
    encabezado()
  }
  /** Pasa a otra página si lo que sigue (alto h) no cabe. */
  const espacio = (h: number) => { if (y - h < 40) nuevaPagina() }
  const titulo = (s: string, sub?: string) => {
    o += T(L, y, s, 12, true)
    if (sub) o += T(L, y - 13, sub, 8, false, gris)
    y -= sub ? 28 : 18
  }

  /** Fila de tarjetas con un número grande. */
  function kpis(items: Array<[string, string, string?]>, porFila: number) {
    const gap = 8, w = (R - L - gap * (porFila - 1)) / porFila, h = 50
    items.forEach(([k, v, det], i) => {
      if (i % porFila === 0) { if (i) y -= h + gap; espacio(h) }
      const x = L + (i % porFila) * (w + gap)
      o += borde(x, y - h, w, h)
      o += T(x + 8, y - 13, cabe(k.toUpperCase(), w - 16, 6.5, true), 6.5, true, gris)
      o += T(x + 8, y - 30, cabe(v, w - 16, 13, true), 13, true)
      if (det) o += T(x + 8, y - 42, cabe(det, w - 16, 7, false), 7, false, gris)
    })
    y -= h + 18
  }

  /** Dona con su leyenda a la derecha, dentro del ancho [x, x + w]. */
  function dona(x: number, w: number, top: number, partes: Parte[], unidad: (v: number) => string, centro: string) {
    const total = partes.reduce((s, p) => s + p.valor, 0)
    const cx = x + 50, cy = top - 50, Ro = 46, Ri = 29
    if (!total) o += `${linea} rg ` + anillo(cx, cy, Ro, Ri, 0, Math.PI * 2) + ' f\n'
    let a = Math.PI / 2
    partes.forEach((p, i) => {
      if (p.valor <= 0) return
      const a1 = a - (p.valor / total) * Math.PI * 2
      o += `${rgb(SERIES[i % SERIES.length])} rg 1 1 1 RG 1.2 w ` + anillo(cx, cy, Ro, Ri, a1, a) + ' b\n'
      a = a1
    })
    o += TC(cx, cy, cabe(centro, Ri * 2 - 4, 9, true), 9, true)
    o += TC(cx, cy - 10, 'total', 6.5, false, gris)
    let ly = top - 12
    const lx = x + 108
    partes.forEach((p, i) => {
      o += caja(lx, ly - 1, 7, 7, rgb(SERIES[i % SERIES.length]))
      o += T(lx + 11, ly, cabe(p.nombre, x + w - 32 - 52 - (lx + 11), 8), 8)
      o += TR(x + w - 32, ly, unidad(p.valor), 8, true)
      o += TR(x + w, ly, pctDe(p.valor, total), 8, false, gris)
      ly -= 13
    })
    return Math.max(104, top - ly + 4)
  }

  /** Barras horizontales de una serie, dentro de [x, x + w]. Devuelve el alto usado. */
  function barrasH(x: number, w: number, top: number, partes: Parte[], unidad: (v: number) => string, vacio = 'Sin datos en este período.') {
    const max = Math.max(0, ...partes.map((p) => p.valor))
    if (!partes.length || !max) { o += T(x, top - 10, vacio, 8.5, false, gris); return 20 }
    let yy = top
    for (const p of partes) {
      o += T(x, yy - 9, cabe(p.nombre.replace(' → ', ' a '), w * 0.55, 8), 8)
      o += TR(x + w, yy - 9, `${unidad(p.valor)}${p.detalle ? ` · ${p.detalle}` : ''}`, 8, true)
      o += caja(x, yy - 20, w, 6, fondo)
      if (p.valor > 0) o += caja(x, yy - 20, Math.max(1.5, (p.valor / max) * w), 6, rgb(UNICO))
      yy -= 22
    }
    return top - yy
  }

  // ---------- Página 1: hoy ----------
  nuevaPagina()
  const p = d.pendiente
  titulo('Hoy en la tostaduría', p.masViejoDias === null ? 'No hay lotes por tostar.' : `El lote más viejo por tostar se recibió hace ${p.masViejoDias} días.`)
  kpis([
    ['Falta por tostar', kgTxt(p.kg), `${lotesTxt(p.lotes)} · recibidos`],
    ['Por trillar', kgTxt(p.porTrillar.kg), lotesTxt(p.porTrillar.lotes)],
    ['En almendra', kgTxt(p.enAlmendra.kg), `${lotesTxt(p.enAlmendra.lotes)} · por tostar`],
    ['Por empacar', kgTxt(p.porEmpacar.kg), `${lotesTxt(p.porEmpacar.lotes)} · almendra`],
    ['Por entregar', kgTxt(p.porEntregar.kg), `${lotesTxt(p.porEntregar.lotes)} · tostado`],
  ], 5)

  espacio(150)
  const mitad = (R - L - 24) / 2
  o += T(L, y, 'Café en proceso por etapa (kg recibidos)', 9.5, true)
  o += T(L + mitad + 24, y, '¿Qué tan atrasados vamos? (lotes sin entregar)', 9.5, true)
  const top = y - 10
  const h1 = dona(L, mitad, top, d.inventario, kgTxt, kgTxt(d.inventario.reduce((s, x) => s + x.valor, 0)))
  const h2 = barrasH(L + mitad + 24, mitad, top - 4, d.atraso, lotesTxt, 'No hay lotes en proceso.')
  y = top - Math.max(h1, h2) - 16

  espacio(60)
  titulo('Lotes más atrasados', 'Sin entregar, del que lleva más días al que menos')
  if (!d.atrasados.length) { o += T(L, y, 'No hay lotes en proceso.', 8.5, false, gris); y -= 18 } else {
    const cols = [L + 6, L + 80, L + 250, L + 310, R - 120, R - 62, R - 6]
    o += caja(L, y - 5, R - L, 16, fondo)
    ;['Lote', 'Cliente', 'Recibido', 'Etapa'].forEach((h, i) => { o += T(cols[i], y, h, 7.5, true, gris) })
    ;['Kilos', 'Días', 'En la etapa'].forEach((h, i) => { o += TR(cols[4 + i], y, h, 7.5, true, gris) })
    y -= 18
    for (const l of d.atrasados) {
      espacio(14)
      o += T(cols[0], y, cabe(l.codigo, 70, 8.5, true), 8.5, true)
      o += T(cols[1], y, cabe(l.cliente, 165, 8.5), 8.5)
      o += T(cols[2], y, fecha(l.fecha), 8.5)
      o += T(cols[3], y, l.etapa, 8.5)
      o += TR(cols[4], y, fmtKg(l.kilos), 8.5)
      o += TR(cols[5], y, String(l.dias), 8.5, true, l.dias > 10 ? rgb('#B42318') : oscuro)
      o += TR(cols[6], y, l.diasEnEtapa === null ? '—' : `${l.diasEnEtapa} d`, 8.5)
      o += raya(L, y - 4, R, y - 4)
      y -= 14
    }
    y -= 10
  }

  // ---------- Página 2: el período ----------
  nuevaPagina()
  const t = d.totales
  titulo(`En el período: ${d.nombreRango.toLowerCase()}`, `Lotes recibidos del ${fecha(d.rango.desde, true)} al ${fecha(d.rango.hasta, true)}`)
  kpis([
    ['Kilos recibidos', kgTxt(t.recibidosKg), lotesTxt(t.lotes)],
    ['Kilos trillados', kgTxt(t.trilladosKg), `Merma promedio ${pctTxt(t.mermaPct)}`],
    ['Almendra a tostar', kgTxt(t.almendraKg), 'Pesado al tostar'],
    ['Café tostado', kgTxt(t.tostadoKg), `Pérdida tueste ${pctTxt(t.perdidaTuestePct)}`],
    ['Cobrado', money(t.cobro), 'Lotes ya tostados'],
    ['Hasta tostar', duracion(d.tiempos.hastaTostarHoras), 'Promedio desde que se recibe'],
    ['Recibido a entregado', duracion(d.tiempos.totalHoras), 'Promedio'],
    ['Rendimiento', pctTxt(t.rendimientoPct), 'Kg tostados por 100 recibidos'],
  ], 4)

  // Recibido vs. tostado, barras agrupadas sobre un solo eje.
  espacio(160)
  const per = d.periodo.periodos
  o += T(L, y, `Recibido vs. tostado (kg por ${d.periodo.agrupacion === 'dia' ? 'día' : d.periodo.agrupacion})`, 9.5, true)
  o += caja(R - 170, y, 7, 7, rgb(SERIES[0])) + T(R - 159, y, 'Recibido', 8, false, gris)
  o += caja(R - 110, y, 7, 7, rgb(SERIES[1])) + T(R - 99, y, 'Tostado (almendra)', 8, false, gris)
  const gx0 = L + 30, gx1 = R, gy0 = y - 118, gy1 = y - 14
  const max = Math.max(0, ...per.flatMap((x) => [x.recibidoKg, x.tostadoKg]))
  const paso = pasoEje(max), tope = Math.max(paso, Math.ceil(max / paso) * paso)
  const Y = (v: number) => gy0 + (v / tope) * (gy1 - gy0)
  for (let v = 0; v <= tope + 1e-9; v += paso) {
    o += raya(gx0, Y(v), gx1, Y(v))
    o += TR(gx0 - 4, Y(v) - 3, fmtNum(v, 0), 7, false, gris)
  }
  const ag = per.length ? (gx1 - gx0) / per.length : 0
  const bw = Math.max(1, Math.min(14, (ag - 4) / 2 - 1))
  const cada = Math.max(1, Math.ceil(per.length / 12))
  per.forEach((x, i) => {
    const x0 = gx0 + i * ag + (ag - 2 * bw - 1) / 2
    if (x.recibidoKg > 0) o += caja(x0, gy0, bw, Y(x.recibidoKg) - gy0, rgb(SERIES[0]))
    if (x.tostadoKg > 0) o += caja(x0 + bw + 1, gy0, bw, Y(x.tostadoKg) - gy0, rgb(SERIES[1]))
    if (i % cada === 0) o += TC(gx0 + i * ag + ag / 2, gy0 - 10, x.nombre, 6.5, false, gris)
  })
  y = gy0 - 30

  espacio(140)
  o += T(L, y, 'Tiempo promedio en cada paso', 9.5, true)
  o += T(L + mitad + 24, y, 'Clientes que más café trajeron (kg, los 6 primeros)', 9.5, true)
  const top2 = y - 6
  const h3 = barrasH(L, mitad, top2, d.tiempos.pasos, duracion, 'Sin las horas de cada etapa.')
  // En el PDF van los 6 primeros, para que el período quepa en una página.
  const h4 = barrasH(L + mitad + 24, mitad, top2, d.clientes.slice(0, 6), kgTxt)
  y = top2 - Math.max(h3, h4) - 16

  espacio(140)
  o += T(L, y, 'Café recibido por proceso (kg)', 9.5, true)
  o += T(L + mitad + 24, y, 'En grano o molido (lotes empacados)', 9.5, true)
  const top3 = y - 10
  const h5 = d.procesos.length ? dona(L, mitad, top3, d.procesos, kgTxt, kgTxt(t.recibidosKg)) : (o += T(L, top3 - 10, 'Sin datos en este período.', 8.5, false, gris), 20)
  const h6 = d.presentacion.length
    ? dona(L + mitad + 24, mitad, top3, d.presentacion, lotesTxt, lotesTxt(d.presentacion.reduce((s, x) => s + x.valor, 0)))
    : (o += T(L + mitad + 24, top3 - 10, 'Sin lotes empacados con la presentación anotada.', 8.5, false, gris), 20)
  y = top3 - Math.max(h5, h6) - 16

  espacio(40 + d.rendimiento.length * 14)
  titulo('Rendimiento por proceso', 'Lo que se pierde en la trilla (merma) y al tostar')
  if (!d.rendimiento.length) { o += T(L, y, 'Sin datos en este período.', 8.5, false, gris) } else {
    const cr = [L + 6, R - 250, R - 170, R - 90, R - 6]
    o += caja(L, y - 5, R - L, 16, fondo)
    o += T(cr[0], y, 'Proceso', 7.5, true, gris)
    ;['Lotes', 'Kilos', 'Merma', 'Pérdida en el tueste'].forEach((h, i) => { o += TR(cr[1 + i], y, h, 7.5, true, gris) })
    y -= 18
    for (const f of d.rendimiento) {
      o += T(cr[0], y, f.proceso, 8.5)
      o += TR(cr[1], y, String(f.lotes), 8.5)
      o += TR(cr[2], y, fmtKg(f.kg), 8.5)
      o += TR(cr[3], y, pctTxt(f.mermaPct), 8.5)
      o += TR(cr[4], y, pctTxt(f.perdidaTuestePct), 8.5)
      o += raya(L, y - 4, R, y - 4)
      y -= 14
    }
  }

  paginas.push(o + TC(W / 2, 22, `Página ${paginas.length + 1}`, 7.5, false, gris))
  return armarPdf(paginas, W, H)
}

/** Polígono de un sector de anillo (de a0 a a1, radianes, sentido antihorario en el PDF). */
function anillo(cx: number, cy: number, Ro: number, Ri: number, a0: number, a1: number) {
  const n = Math.max(2, Math.ceil(((a1 - a0) / (Math.PI * 2)) * 72))
  const pts: string[] = []
  for (let i = 0; i <= n; i++) { const a = a0 + ((a1 - a0) * i) / n; pts.push(`${(cx + Ro * Math.cos(a)).toFixed(1)} ${(cy + Ro * Math.sin(a)).toFixed(1)}`) }
  for (let i = n; i >= 0; i--) { const a = a0 + ((a1 - a0) * i) / n; pts.push(`${(cx + Ri * Math.cos(a)).toFixed(1)} ${(cy + Ri * Math.sin(a)).toFixed(1)}`) }
  return pts.map((p, i) => `${p} ${i ? 'l' : 'm'}`).join(' ') + ' h'
}

function pasoEje(max: number) {
  if (max <= 0) return 1
  const bruto = max / 4, p = 10 ** Math.floor(Math.log10(bruto)), n = bruto / p
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p
}
