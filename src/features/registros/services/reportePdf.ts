// Reporte de un lote en PDF (A4, 595×842 pt): cliente, los datos de cada etapa por la que ya pasó y el cobro.
import { ancho, armarPdf, escapar, rgb } from '../../../lib/pdf'
import { cel, dec, fecha, hoyISO, kg, kgDeG, miles } from '../../../lib/format'
import { NEGOCIO } from '../../remision/negocio'
import { yaEsta } from '../etapas'
import type { Registro } from '../types'
import { almacenHasta, calcularCobro, calcularMerma, calcularPerdidaTueste, capaTrilla, describirBolsas } from '../utils'

const W = 595, H = 842, L = 40, R = 555
const COL = (R - L) / 3
const oscuro = rgb('#122620'), gris = rgb('#52665A'), esmeralda = rgb('#0B5E42'), linea = rgb('#D9E5DB'), arena = rgb('#F3E5C8')

const T = (x: number, y: number, s: string, size: number, bold = false, color = oscuro) =>
  `${color} rg BT /${bold ? 'F2' : 'F1'} ${size} Tf ${x.toFixed(1)} ${y.toFixed(1)} Td (${escapar(s)}) Tj ET\n`
const TR = (xr: number, y: number, s: string, size: number, bold = false, color = oscuro) => T(xr - ancho(s, size, bold), y, s, size, bold, color)
const raya = (y: number, color = linea, w = 0.5) => `${color} RG ${w} w ${L} ${y.toFixed(1)} m ${R} ${y.toFixed(1)} l S\n`

/** Recorta el texto con "…" para que quepa en ese ancho. */
function cabe(s: string, max: number, size: number, bold: boolean) {
  if (ancho(s, size, bold) <= max) return s
  let t = s
  while (t && ancho(t + '…', size, bold) > max) t = t.slice(0, -1)
  return t + '…'
}

type Dato = [string, string]
/** Datos de una etapa. largos: cada uno ocupa toda la fila (textos largos). */
interface Seccion { titulo: string; datos: Dato[]; largos?: Dato[] }

function secciones(r: Registro): Seccion[] {
  const merma = calcularMerma(r)
  const perdida = calcularPerdidaTueste(r)
  const s: Seccion[] = [
    {
      titulo: 'Cliente',
      datos: [
        ['Nombre', r.cliente], ['Celular', cel(r.celular)],
        ['Factura electrónica', r.factura ? `Sí · ${r.tipoDoc} ${r.numDoc || 'falta'}` : 'No'],
      ],
      largos: r.factura && r.correo ? [['Correo', r.correo]] : [],
    },
    {
      titulo: 'Recibido',
      datos: [
        ['Fecha', fecha(r.fecha, true)], ['Proceso', r.proceso], ['Kilos recibidos', `${kg(r.kilos)} kg`],
        ['Humedad', r.humedad === null ? '—' : `${kg(r.humedad)} %`],
        ['Densidad del grano', r.densidad === null ? '—' : `${kg(r.densidad)} g/L`],
      ],
      largos: [['Bolsas y drips pedidos', describirBolsas(r)]],
    },
  ]
  if (yaEsta(r, 'Tostado')) {
    s.push({
      titulo: 'Trillado y tostado',
      datos: [
        ['Peso en almendra', r.gramos === null ? '—' : `${kgDeG(r.gramos)} kg`],
        [`Merma (sin ${capaTrilla(r.proceso)})`, merma === null ? '—' : `${dec(merma, 1)} %`],
        ['Libras a tostar', calcularCobro({ ...r, gramosTostado: null }, r.precios).librasTxt],
      ],
    })
  }
  if (yaEsta(r, 'Empacado')) {
    s.push({
      titulo: 'Empacado',
      datos: [
        ['Peso del café tostado', r.gramosTostado === null ? '—' : `${kgDeG(r.gramosTostado)} kg`],
        ['Pérdida en el tueste', perdida === null ? '—' : `${dec(perdida, 1)} %`],
        ['Sobrante sin empacar', r.gramosSobrante ? `${miles(r.gramosSobrante)} g` : '—'],
      ],
      largos: [['Bolsas y drips', describirBolsas(r)]],
    })
  }
  if (yaEsta(r, 'Entregado')) {
    const a = r.almacenamiento
    const hasta = almacenHasta(r)
    s.push({
      titulo: 'Entregado',
      datos: [
        ['Fecha de entrega', r.entregadoAt ? fecha(r.entregadoAt.slice(0, 10), true) : '—'],
        ['Contabilidad', r.estado],
        ['Almacenamiento', a ? `${a.dias} ${a.dias === 1 ? 'día' : 'días'} · ${kgDeG(a.gramos)} kg` : 'No'],
        ...(a && hasta ? [['Almacenado hasta', fecha(hasta, true)] as Dato] : []),
      ],
      largos: a ? [['Cómo va marcado', a.marcado]] : [],
    })
  }
  return s
}

export function construirReporteLote(r: Registro): Uint8Array<ArrayBuffer> {
  let o = ''

  // Encabezado
  o += T(L, 800, NEGOCIO.nombre, 14, true, esmeralda)
  o += T(L, 785, `NIT ${NEGOCIO.nit} · ${NEGOCIO.ciudad}`, 8.5, false, gris)
  o += TR(R, 803, 'REPORTE DE LOTE', 7.5, true, gris)
  o += TR(R, 786, r.codigo, 14, true)
  o += TR(R, 772, `Etapa: ${r.etapa}`, 8.5, false, gris)
  o += raya(762, esmeralda, 1.4)

  // Etapas: título y datos en tres columnas
  let y = 740
  for (const sec of secciones(r)) {
    o += T(L, y, sec.titulo, 11, true, esmeralda)
    y -= 18
    sec.datos.forEach(([k, v], i) => {
      const x = L + (i % 3) * COL
      const fila = y - Math.floor(i / 3) * 30
      o += T(x, fila, k.toUpperCase(), 7, true, gris)
      o += T(x, fila - 12, cabe(v, COL - 10, 10.5, true), 10.5, true)
    })
    y -= Math.ceil(sec.datos.length / 3) * 30
    for (const [k, v] of sec.largos ?? []) {
      o += T(L, y, k.toUpperCase(), 7, true, gris)
      o += T(L, y - 12, cabe(v, R - L, 10.5, true), 10.5, true)
      y -= 30
    }
    o += raya(y + 8)
    y -= 14
  }

  // Cobro: se estima desde que se anota el peso en almendra (al tostar) y queda con el peso tostado (al empacar).
  if (yaEsta(r, 'Tostado')) {
    const c = calcularCobro(r, r.precios)
    o += T(L, y, 'Cobro', 11, true, esmeralda)
    y -= 18
    for (const [concepto, detalle, valor] of [
      ['Tostión', c.fTostion, c.tostionTxt],
      ['Bolsas y drips', c.fBolsas, c.bolsasTxt],
    ]) {
      o += T(L, y, concepto, 10.5, true)
      o += T(L + 120, y, detalle, 9, false, gris)
      o += TR(R, y, valor, 10.5, true)
      y -= 18
    }
    o += `${arena} rg ${L} ${(y - 32).toFixed(1)} ${R - L} 40 re f\n`
    o += T(L + 12, y - 9, 'Total', 11, true, esmeralda)
    o += T(L + 12, y - 23, `Forma de pago · ${r.pago ?? 'Sin dato'}`, 8.5, false, gris)
    o += TR(R - 12, y - 19, c.totalTxt, 17, true, esmeralda)
  } else {
    o += T(L, y, 'El cobro se estima al tostar y queda con el peso tostado al empacar.', 9, false, gris)
  }

  o += T(L, 30, `Generado el ${fecha(hoyISO(), true)}.`, 8, false, gris)
  return armarPdf(o, W, H)
}
