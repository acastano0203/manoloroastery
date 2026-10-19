// Remisión en PDF de una página (420×595 pt).
import { ancho, armarPdf, escapar } from '../../../lib/pdf'
import { NEGOCIO } from '../negocio'
import type { DatosRemision } from '../types'

export function construirPdf(d: DatosRemision): Uint8Array<ArrayBuffer> {
  const W = 420, H = 595, L = 32, R = 388
  const gris = '0.322 0.4 0.353', oscuro = '0.071 0.149 0.125', esmeralda = '0.043 0.369 0.259'
  const T = (x: number, y: number, s: string, size: number, bold = false, rgb = oscuro) =>
    `${rgb} rg BT /${bold ? 'F2' : 'F1'} ${size} Tf ${x.toFixed(1)} ${y.toFixed(1)} Td (${escapar(s)}) Tj ET\n`
  const TR = (xr: number, y: number, s: string, size: number, bold = false, rgb = oscuro) =>
    T(xr - ancho(s, size, bold), y, s, size, bold, rgb)
  const linea = (y: number, rgb = '0.9 0.9 0.89', w = 0.6) => `${rgb} RG ${w} w ${L} ${y} m ${R} ${y} l S\n`

  let o = ''
  o += T(L, 547, NEGOCIO.nombre, 13, true, esmeralda)
  o += T(L, 532, `NIT ${NEGOCIO.nit} · ${NEGOCIO.ciudad}`, 8.5, false, gris)
  o += T(L, 520, NEGOCIO.celular, 8.5, false, gris)
  o += TR(R, 550, 'REMISIÓN', 7.5, true, gris)
  o += TR(R, 533, d.codigo, 15, true)
  o += TR(R, 520, d.fechaLarga, 8.5, false, gris)
  o += linea(506, '0.784 0.643 0.431', 1.6)
  o += T(L, 484, 'CLIENTE', 7.5, true, gris)
  o += T(L, 469, d.cliente, 11.5, true)
  o += T(L, 455, d.celularTxt, 9.5, false, gris)
  o += T(220, 484, 'CAFÉ RECIBIDO', 7.5, true, gris)
  o += T(220, 469, `${d.proceso} · ${d.kilosTxt}`, 11.5, true)
  o += T(220, 455, `Tostado: ${d.gramosTxt}`, 9.5, false, gris)
  o += T(L, 424, 'Concepto', 8, true, gris)
  o += TR(R, 424, 'Valor', 8, true, gris)
  o += linea(418)
  let y = 400
  for (const l of d.lineas) {
    o += T(L, y, l.concepto, 10.5, true)
    o += T(L, y - 13, l.detalle, 8.5, false, gris)
    o += TR(R, y, l.valor, 10.5, true)
    o += linea(y - 22)
    y -= 38
  }
  const yb = y + 8
  o += `0.953 0.898 0.784 rg ${L} ${yb - 46} ${R - L} 46 re f\n`
  o += T(L + 12, yb - 19, 'Total', 11, true, esmeralda)
  o += T(L + 12, yb - 33, `Pagado · ${d.pago}`, 8.5, false, gris)
  o += TR(R - 12, yb - 30, d.cobro.totalTxt, 17, true, esmeralda)
  o += T(L, yb - 72, `Registrado en contabilidad el ${d.fechaLarga}.`, 8.5, false, gris)
  o += T(L, yb - 85, NEGOCIO.nota, 8.5, false, gris)

  return armarPdf(o, W, H)
}
