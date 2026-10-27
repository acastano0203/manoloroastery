// Formatos colombianos: punto de miles, coma decimal.
export const miles = (n: number | string) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
export const money = (n: number) => '$ ' + miles(Math.round(n || 0))
export const dec = (n: number, d: number) => {
  const p = (n || 0).toFixed(d).split('.')
  return miles(p[0]) + (d ? ',' + p[1] : '')
}
export const kg = (n: number | string | null | undefined) => String(n ?? '').replace('.', ',')
export const soloDigitos = (s: string) => String(s || '').replace(/\D/g, '')
export const cel = (c: string) => {
  const d = soloDigitos(c)
  return d.length === 10 ? `+57 ${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}` : '+57 ' + d
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
export const fecha = (iso: string, larga = false) => {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return Number(d) + ' ' + MESES[Number(m) - 1] + (larga ? ' ' + y : '')
}

/** "2026-10-28T15:40:00Z" → "28 oct · 3:40 p. m." (hora local). */
export const fechaHora = (iso: string) => {
  const d = new Date(iso)
  return `${d.getDate()} ${MESES[d.getMonth()]} · ${d.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' })}`
}

export const hoyISO = (offset = 0) => {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** "1.250" → 1250. Vacío → null, inválido → NaN. */
export const parseG = (v: string) => {
  const s = String(v || '').trim().replace(/\./g, '').replace(',', '.')
  if (s === '') return null
  const n = Number(s)
  return isNaN(n) ? NaN : n
}
/** "12,5" → 12.5. Vacío → null, inválido → NaN. */
export const parseKg = (v: string) => {
  const s = String(v || '').trim().replace(',', '.')
  if (s === '') return null
  const n = Number(s)
  return isNaN(n) ? NaN : n
}

/** Gramos → kilos para mostrar o escribir en un campo: 16000 → "16", 4235 → "4,235". */
export const kgDeG = (g: number) => kg(Math.round(g) / 1000)
/** Kilos escritos ("4,2") → gramos (4200), para calcular y guardar. Vacío → null, inválido → NaN. */
export const parseKgAG = (v: string) => {
  const k = parseKg(v)
  return k === null || isNaN(k) ? k : Math.round(k * 1000)
}

/** Minúsculas y sin tildes, para buscar. */
export const norm = (x: string) => String(x || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
