// PDF de una página escrito a mano, sin librerías.
// Usa Helvetica con WinAnsiEncoding: los caracteres fuera de Latin-1 se reemplazan.

const ESPECIALES: Record<string, string> = { '—': '\x97', '–': '\x96', '…': '\x85', '“': '\x93', '”': '\x94', '‘': '\x91', '’': '\x92' }

export function escapar(s: string) {
  let o = ''
  for (const ch of s) o += ESPECIALES[ch] ?? (ch.charCodeAt(0) < 256 ? ch : '?')
  return o.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
}

/** Ancho aproximado del texto en Helvetica, para alinear a la derecha. */
export function ancho(s: string, size: number, bold: boolean) {
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

/** "r g b" (0–1) a partir de "#rrggbb", para los operadores rg/RG. */
export const rgb = (hex: string) =>
  [1, 3, 5].map((i) => (parseInt(hex.slice(i, i + 2), 16) / 255).toFixed(3)).join(' ')

/**
 * Arma un PDF de W×H puntos con el contenido dado (F1 = Helvetica, F2 = Helvetica-Bold).
 * Con una lista de contenidos, cada uno es una página.
 */
export function armarPdf(contenido: string | string[], W: number, H: number): Uint8Array<ArrayBuffer> {
  const paginas = Array.isArray(contenido) ? contenido : [contenido]
  // 1 catálogo, 2 páginas, 3 y 4 fuentes; luego cada página con su contenido.
  const objetos = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    `<< /Type /Pages /Kids [${paginas.map((_, i) => `${5 + i * 2} 0 R`).join(' ')}] /Count ${paginas.length} >>`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
    ...paginas.flatMap((c, i) => [
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${6 + i * 2} 0 R >>`,
      `<< /Length ${c.length} >>\nstream\n${c}\nendstream`,
    ]),
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
