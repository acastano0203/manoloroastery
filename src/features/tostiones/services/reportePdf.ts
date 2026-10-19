// Reporte de una tostión en PDF (A4, 595×842 pt): datos, curva de temperaturas, aire y llama, y tabla de lecturas.
import { ancho, armarPdf, escapar, rgb } from '../../../lib/pdf'
import { dec, fecha, miles } from '../../../lib/format'
import { NEGOCIO } from '../../remision/negocio'
import type { Registro } from '../../registros/types'
import { COLORES } from '../colores'
import type { Tostion } from '../types'
import { lecturasCompletas, minutoFinal, mmss, resumenTiempos } from '../utils'

const W = 595, H = 842, L = 40, R = 555
const oscuro = rgb('#122620'), gris = rgb('#52665A'), esmeralda = rgb('#0B5E42'), linea = rgb('#D9E5DB')

const T = (x: number, y: number, s: string, size: number, bold = false, color = oscuro) =>
  `${color} rg BT /${bold ? 'F2' : 'F1'} ${size} Tf ${x.toFixed(1)} ${y.toFixed(1)} Td (${escapar(s)}) Tj ET\n`
const TR = (xr: number, y: number, s: string, size: number, bold = false, color = oscuro) => T(xr - ancho(s, size, bold), y, s, size, bold, color)
const TC = (xc: number, y: number, s: string, size: number, bold = false, color = oscuro) => T(xc - ancho(s, size, bold) / 2, y, s, size, bold, color)
const raya = (x1: number, y1: number, x2: number, y2: number, color = linea, w = 0.5, guion = '') =>
  `${guion ? `[${guion}] 0 d ` : ''}${color} RG ${w} w ${x1.toFixed(1)} ${y1.toFixed(1)} m ${x2.toFixed(1)} ${y2.toFixed(1)} l S${guion ? ' [] 0 d' : ''}\n`
const polilinea = (pts: Array<[number, number]>, color: string, w = 1.6) =>
  pts.length < 2 ? '' : `${color} RG ${w} w 1 J 1 j ${pts.map(([x, y], i) => `${x.toFixed(1)} ${y.toFixed(1)} ${i ? 'l' : 'm'}`).join(' ')} S 0 J 0 j\n`
const punto = ([x, y]: [number, number], color: string) => `${color} rg ${(x - 1.8).toFixed(1)} ${(y - 1.8).toFixed(1)} 3.6 3.6 re f\n`

interface Datos {
  r: Pick<Registro, 'cliente' | 'codigo' | 'proceso' | 'fecha'>
  t: Tostion
  numero: number
}

export function construirReporteTostion({ r, t, numero }: Datos): Uint8Array<ArrayBuffer> {
  const lecturas = lecturasCompletas(t)
  const { desarrollo, dtr } = resumenTiempos(t)
  const minMax = minutoFinal(t)
  let o = ''

  // Encabezado
  o += T(L, 800, NEGOCIO.nombre, 14, true, esmeralda)
  o += T(L, 785, `NIT ${NEGOCIO.nit} · ${NEGOCIO.ciudad}`, 8.5, false, gris)
  o += TR(R, 803, 'REPORTE DE TOSTIÓN', 7.5, true, gris)
  o += TR(R, 786, `${r.codigo} · Bache ${numero}`, 14, true)
  o += TR(R, 772, fecha(t.creadaAt.slice(0, 10), true), 8.5, false, gris)
  o += raya(L, 762, R, 762, esmeralda, 1.4)

  // Datos
  const datos: Array<[string, string]> = [
    ['Cliente', r.cliente], ['Proceso', r.proceso], ['Café verde', `${miles(t.gramosVerde)} g`],
    ['Temp. de carga', t.tempCarga === null ? '—' : `${dec(t.tempCarga, 1)} °C`],
    ['Aire inicial', t.aireInicial === null ? '—' : `${t.aireInicial} %`], ['Llama inicial', t.llamaInicial === null ? '—' : `${t.llamaInicial} %`],
    ['Primer crack', t.crackSeg === null ? '—' : mmss(t.crackSeg)], ['Descarga', t.descargaSeg === null ? '—' : mmss(t.descargaSeg)],
    ['Desarrollo', desarrollo === null ? '—' : `${mmss(desarrollo)}${dtr === null ? '' : ` (DTR ${dec(dtr, 1)} %)`}`],
  ]
  datos.forEach(([k, v], i) => {
    const x = L + (i % 3) * 172, y = 742 - Math.floor(i / 3) * 30
    o += T(x, y, k.toUpperCase(), 7, true, gris)
    o += T(x, y - 12, v, 10.5, true)
  })

  // Curva de temperaturas
  const temps = lecturas.flatMap((l) => [l.tempGrano, l.tempTambor]).filter((v): v is number => v !== null)
  // El eje arranca un poco por debajo de la temperatura más baja (no en 0): así la curva usa todo el alto.
  const tMin = temps.length ? Math.max(0, Math.floor(Math.min(...temps) / 50) * 50 - 50) : 0
  const tMax = temps.length ? Math.max(250, Math.ceil(Math.max(...temps) / 50) * 50) : 250
  const gx0 = L + 30, gx1 = R, gy0 = 438, gy1 = 618
  const X = (seg: number) => gx0 + (seg / 60 / minMax) * (gx1 - gx0)
  const Y = (v: number) => gy0 + ((v - tMin) / (tMax - tMin)) * (gy1 - gy0)
  o += T(L, 640, 'Curva de temperatura (°C)', 10, true)
  o += `${COLORES.grano.pdf} rg ${R - 160} 642 10 3 re f\n` + T(R - 146, 640, 'Grano', 8.5, false, gris)
  o += `${COLORES.tambor.pdf} rg ${R - 90} 642 10 3 re f\n` + T(R - 76, 640, 'Tambor', 8.5, false, gris)
  for (let v = tMin; v <= tMax; v += 50) {
    o += raya(gx0, Y(v), gx1, Y(v))
    o += TR(gx0 - 5, Y(v) - 3, String(v), 7.5, false, gris)
  }
  const paso = minMax > 15 ? 2 : 1
  for (let m = 0; m <= minMax; m += paso) {
    o += raya(X(m * 60), gy0, X(m * 60), gy0 - 3, gris)
    o += TC(X(m * 60), gy0 - 12, String(m), 7.5, false, gris)
  }
  o += TC((gx0 + gx1) / 2, gy0 - 24, 'minutos', 7.5, false, gris)
  // Cada marca en su renglón (crack arriba, descarga abajo) para que no se pisen si quedan cerca.
  for (const [seg, nombre, yTexto] of [[t.crackSeg, '1er crack', gy1 - 9], [t.descargaSeg, 'Descarga', gy1 - 20]] as const) {
    if (seg === null) continue
    o += raya(X(seg), gy0, X(seg), gy1, gris, 0.8, '3 2')
    const texto = `${nombre} ${mmss(seg)}`
    // A la derecha de la línea, o a la izquierda si se saldría de la gráfica.
    o += X(seg) + 3 + ancho(texto, 7.5, true) > gx1
      ? TR(X(seg) - 3, yTexto, texto, 7.5, true, gris)
      : T(X(seg) + 3, yTexto, texto, 7.5, true, gris)
  }
  for (const serie of ['grano', 'tambor'] as const) {
    const pts = lecturas
      .map((l) => [l.segundo, serie === 'grano' ? l.tempGrano : l.tempTambor] as const)
      .filter((p): p is readonly [number, number] => p[1] !== null)
      .map(([s, v]): [number, number] => [X(s), Y(v)])
    o += polilinea(pts, COLORES[serie].pdf)
    for (const p of pts) o += punto(p, COLORES[serie].pdf)
  }

  // Aire y llama (0–100 %), en escalones: el valor sigue hasta el siguiente cambio
  const ay0 = 318, ay1 = 372
  const A = (v: number) => ay0 + (v / 100) * (ay1 - ay0)
  o += T(L, 388, 'Aire y llama (%)', 10, true)
  o += `${COLORES.aire.pdf} rg ${R - 160} 390 10 3 re f\n` + T(R - 146, 388, 'Aire', 8.5, false, gris)
  o += `${COLORES.llama.pdf} rg ${R - 90} 390 10 3 re f\n` + T(R - 76, 388, 'Llama', 8.5, false, gris)
  for (const v of [0, 50, 100]) {
    o += raya(gx0, A(v), gx1, A(v))
    o += TR(gx0 - 5, A(v) - 3, String(v), 7.5, false, gris)
  }
  for (const serie of ['aire', 'llama'] as const) {
    const pts: Array<[number, number]> = []
    for (const l of lecturas) {
      const v = l[serie]
      if (v === null) continue
      if (pts.length) pts.push([X(l.segundo), pts[pts.length - 1][1]])
      pts.push([X(l.segundo), A(v)])
    }
    if (pts.length) pts.push([X((t.descargaSeg ?? lecturas[lecturas.length - 1].segundo)), pts[pts.length - 1][1]])
    o += polilinea(pts, COLORES[serie].pdf, 1.4)
  }

  // Tabla de lecturas (en dos columnas si son muchas)
  o += T(L, 292, 'Lecturas', 10, true)
  const porColumna = 22
  const columnas = [lecturas.slice(0, porColumna), lecturas.slice(porColumna, porColumna * 2)]
  columnas.forEach((filas, c) => {
    if (!filas.length) return
    const x = L + c * 262
    const cx = [x, x + 50, x + 110, x + 170, x + 220]
    let y = 276
    ;['Min', 'Grano °C', 'Tambor °C', 'Aire %', 'Llama %'].forEach((h, i) => { o += T(cx[i], y, h, 7.5, true, gris) })
    o += raya(x, y - 4, x + 250, y - 4)
    for (const l of filas) {
      y -= 11.5
      o += T(cx[0], y, mmss(l.segundo), 8.5)
      o += T(cx[1], y, l.tempGrano === null ? '—' : dec(l.tempGrano, 1), 8.5)
      o += T(cx[2], y, l.tempTambor === null ? '—' : dec(l.tempTambor, 1), 8.5)
      o += T(cx[3], y, l.aire === null ? '—' : String(l.aire), 8.5)
      o += T(cx[4], y, l.llama === null ? '—' : String(l.llama), 8.5)
    }
  })
  if (!lecturas.length) o += T(L, 276, 'Sin lecturas registradas.', 9, false, gris)
  if (lecturas.length > porColumna * 2) o += T(L, 24, `Y ${lecturas.length - porColumna * 2} lecturas más (ver en la app).`, 8, false, gris)
  if (t.notas) o += T(L, 40, `Notas: ${t.notas}`, 8.5, false, gris)

  return armarPdf(o, W, H)
}
