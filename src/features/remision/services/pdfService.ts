// PDF de una página (A5 apaisado reducido, 420×595 pt) escrito a mano, sin librerías.
// Usa Helvetica con WinAnsiEncoding: los caracteres fuera de Latin-1 se reemplazan.
import { NEGOCIO } from '../negocio'
import type { DatosRemision } from '../types'

const ESPECIALES: Record<string, string> = { '—': '\x97', '–': '\x96', '…': '\x85', '“': '\x93', '”': '\x94', '‘': '\x91', '’': '\x92' }

function escapar(s: string) {
  let o = ''
  for (const ch of s) o += ESPECIALES[ch] ?? (ch.charCodeAt(0) < 256 ? ch : '?')
  return o.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
}

/** Ancho aproximado del texto en Helvetica, para alinear a la derecha. */
function ancho(s: string, size: number, bold: boolean) {
  const angosto = ' .,:;!|iljI\'·', medio = 'ftr-()', ancho = 'mwMW'
  let w = 0
  for (const ch of s) {
    if (/[0-9$]/.test(ch)) w += 556
    else if (angosto.includes(ch)) w += ch === ' ' ? 278 : 250
    else if (medio.includes(ch)) w += 320
    else if (ancho.includes(ch)) w += 860
    else if (ch === '×' || ch === '÷') w += 584
    else if ((ch >= 'A' && ch <= 'Z') || 'ÁÉÍÓÚÑ'.includes(ch)) w += bold ? 722 : 667
    else w += bold ? 590 : 556
  }
  return (w * size) / 1000
}

export function construirPdf(d: DatosRemision): Uint8Array<ArrayBuffer> {
  const W = 420, H = 595, L = 32, R = 388
  const gris = '0.42 0.33 0.27', oscuro = '0.169 0.102 0.071', vino = '0.482 0.118 0.133'
  const T = (x: number, y: number, s: string, size: number, bold = false, rgb = oscuro) =>
    `${rgb} rg BT /${bold ? 'F2' : 'F1'} ${size} Tf ${x.toFixed(1)} ${y.toFixed(1)} Td (${escapar(s)}) Tj ET\n`
  const TR = (xr: number, y: number, s: string, size: number, bold = false, rgb = oscuro) =>
    T(xr - ancho(s, size, bold), y, s, size, bold, rgb)
  const linea = (y: number, rgb = '0.9 0.9 0.89', w = 0.6) => `${rgb} RG ${w} w ${L} ${y} m ${R} ${y} l S\n`

  let o = ''
  o += T(L, 547, NEGOCIO.nombre, 13, true, vino)
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
  o += T(L + 12, yb - 19, 'Total', 11, true, vino)
  o += T(L + 12, yb - 33, `Pagado · ${d.pago}`, 8.5, false, gris)
  o += TR(R - 12, yb - 30, d.cobro.totalTxt, 17, true, vino)
  o += T(L, yb - 72, `Registrado en contabilidad el ${d.fechaLarga}.`, 8.5, false, gris)
  o += T(L, yb - 85, NEGOCIO.nota, 8.5, false, gris)

  const objetos = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
    `<< /Length ${o.length} >>\nstream\n${o}\nendstream`,
  ]
  let out = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n'
  const offsets: number[] = []
  objetos.forEach((ob, i) => {
    offsets.push(out.length)
    out += `${i + 1} 0 obj\n${ob}\nendobj\n`
  })
  const xref = out.length
  out += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n` + offsets.map((n) => String(n).padStart(10, '0') + ' 00000 n \n').join('')
  out += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`

  // Cada carácter ya es un byte (0–255).
  const bytes = new Uint8Array(out.length)
  for (let i = 0; i < out.length; i++) bytes[i] = out.charCodeAt(i) & 255
  return bytes
}
