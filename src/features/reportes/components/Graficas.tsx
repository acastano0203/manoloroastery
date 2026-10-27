import { useId, useState, type ReactNode } from 'react'
import { cx } from '../../../lib/cx'
import { SERIES, UNICO } from '../colores'
import type { Parte } from '../reportes'

const pct = (v: number, total: number) => (total ? (v / total) * 100 : 0)
const fmtPct = (n: number) => `${n.toFixed(n >= 10 || n === 0 ? 0 : 1).replace('.', ',')} %`

/** Tarjeta con título que envuelve cada gráfica. */
export function Panel({ titulo, subtitulo, children, className }: { titulo: string; subtitulo?: string; children: ReactNode; className?: string }) {
  const id = useId()
  return (
    <section aria-labelledby={id} className={cx('flex min-w-0 flex-col gap-4 rounded-[14px] border border-linea bg-white p-4 md:p-5', className)}>
      <div className="flex flex-col gap-0.5">
        <h2 id={id} className="m-0 text-lg font-bold">{titulo}</h2>
        {subtitulo && <p className="m-0 text-sm text-pizarra-suave">{subtitulo}</p>}
      </div>
      {children}
    </section>
  )
}

/**
 * Torta (dona) con leyenda: cada parte con su color, valor y %. El total va en el centro.
 * Las partes van en orden fijo; el color sigue a la parte (no a su tamaño).
 */
export function Dona({ partes, unidad, total: totalTxt, colores = SERIES }: {
  partes: Parte[]
  /** Cómo se escribe cada valor: "12,5 kg", "3 lotes"… */
  unidad: (v: number) => string
  /** Texto del centro. */
  total: string
  colores?: readonly string[]
}) {
  const [foco, setFoco] = useState<string | null>(null)
  const total = partes.reduce((s, p) => s + p.valor, 0)
  const R = 80, r = 52, C = 90
  let angulo = -Math.PI / 2
  const arcos = partes.map((p, i) => {
    const a0 = angulo
    const a1 = angulo + (total ? (p.valor / total) * Math.PI * 2 : 0)
    angulo = a1
    return { p, color: colores[i % colores.length], d: sector(C, C, R, r, a0, a1) }
  })
  const enFoco = partes.find((p) => p.clave === foco)

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
      <svg viewBox="0 0 180 180" className="h-[180px] w-[180px] shrink-0" role="img"
        aria-label={partes.map((p) => `${p.nombre}: ${unidad(p.valor)} (${fmtPct(pct(p.valor, total))})`).join('; ') || 'Sin datos'}>
        {total === 0 && <circle cx={C} cy={C} r={(R + r) / 2} fill="none" stroke="var(--color-linea)" strokeWidth={R - r} />}
        {arcos.map(({ p, color, d }) => p.valor > 0 && (
          <path key={p.clave} d={d} fill={color} stroke="#fff" strokeWidth={2}
            opacity={foco && foco !== p.clave ? 0.35 : 1}
            onPointerEnter={() => setFoco(p.clave)} onPointerLeave={() => setFoco(null)}>
            <title>{`${p.nombre}: ${unidad(p.valor)} (${fmtPct(pct(p.valor, total))})${p.detalle ? ` · ${p.detalle}` : ''}`}</title>
          </path>
        ))}
        <text x={C} y={C - 2} textAnchor="middle" fontSize={enFoco ? 15 : 17} fontWeight={700} fill="var(--color-bosque)">
          {enFoco ? fmtPct(pct(enFoco.valor, total)) : totalTxt}
        </text>
        <text x={C} y={C + 16} textAnchor="middle" fontSize={11} fill="var(--color-pizarra-suave)">
          {enFoco ? enFoco.nombre : 'total'}
        </text>
      </svg>
      <ul className="m-0 flex w-full min-w-0 list-none flex-col gap-1.5 p-0">
        {partes.map((p, i) => (
          <li key={p.clave} onPointerEnter={() => setFoco(p.clave)} onPointerLeave={() => setFoco(null)}
            className={cx('flex items-center gap-2.5 rounded-lg px-2 py-1 text-[15px]', foco === p.clave && 'bg-rocio-claro')}>
            <span className="h-3 w-3 shrink-0 rounded-[3px]" style={{ background: colores[i % colores.length] }} aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="font-semibold">{p.nombre}</span>
              {p.detalle && <span className="text-pizarra-suave"> · {p.detalle}</span>}
            </span>
            <span className="whitespace-nowrap font-semibold tabular-nums">{unidad(p.valor)}</span>
            <span className="w-12 text-right text-sm text-pizarra-suave tabular-nums">{fmtPct(pct(p.valor, total))}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Camino SVG de un sector de dona, de a0 a a1 (radianes). */
function sector(cx: number, cy: number, R: number, r: number, a0: number, a1: number) {
  // Un sector de vuelta completa no se dibuja como arco: se parte en dos.
  if (a1 - a0 >= Math.PI * 2 - 1e-6) a1 = a0 + Math.PI * 2 - 1e-4
  const g = a1 - a0 > Math.PI ? 1 : 0
  const p = (rad: number, a: number) => `${(cx + rad * Math.cos(a)).toFixed(2)} ${(cy + rad * Math.sin(a)).toFixed(2)}`
  return `M${p(R, a0)} A${R} ${R} 0 ${g} 1 ${p(R, a1)} L${p(r, a1)} A${r} ${r} 0 ${g} 0 ${p(r, a0)} Z`
}

/** Barras horizontales de una sola serie, con el valor escrito al final de cada una. */
export function BarrasH({ partes, unidad, color = UNICO, vacio = 'Sin datos en este período.' }: {
  partes: Parte[]
  unidad: (v: number) => string
  color?: string
  vacio?: string
}) {
  const max = Math.max(0, ...partes.map((p) => p.valor))
  if (!partes.length || max === 0) return <p className="m-0 text-[15px] text-pizarra-suave">{vacio}</p>
  return (
    <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
      {partes.map((p) => (
        <li key={p.clave} className="group flex flex-col gap-1" title={`${p.nombre}: ${unidad(p.valor)}${p.detalle ? ` · ${p.detalle}` : ''}`}>
          <span className="flex items-baseline justify-between gap-3 text-[15px]">
            <span className="min-w-0 truncate font-semibold">{p.nombre}</span>
            <span className="whitespace-nowrap tabular-nums">
              <span className="font-semibold">{unidad(p.valor)}</span>
              {p.detalle && <span className="text-sm text-pizarra-suave"> · {p.detalle}</span>}
            </span>
          </span>
          <span className="h-3 w-full rounded-r-[4px] bg-rocio-claro">
            <span className="block h-3 rounded-r-[4px] transition-opacity group-hover:opacity-80"
              style={{ width: `${Math.max(p.valor > 0 ? 1.5 : 0, pct(p.valor, max))}%`, background: color }} />
          </span>
        </li>
      ))}
    </ul>
  )
}

export interface Serie { clave: string; nombre: string; color: string }

/**
 * Barras verticales agrupadas: una barra por serie en cada período, sobre un solo eje.
 * Al pasar el mouse o el dedo por un período muestra sus valores.
 */
export function BarrasV({ grupos, series, valor, unidad, eje }: {
  grupos: Array<{ clave: string; nombre: string }>
  series: Serie[]
  valor: (grupo: number, serie: string) => number
  unidad: (v: number) => string
  /** Cómo se escriben los números del eje. */
  eje: (v: number) => string
}) {
  const [foco, setFoco] = useState<number | null>(null)
  const max = Math.max(0, ...grupos.flatMap((_, i) => series.map((s) => valor(i, s.clave))))
  const paso = escalaBonita(max)
  const tope = Math.max(paso, Math.ceil(max / paso) * paso)
  const VW = 640, H = 200, M = { izq: 48, der: 8, arr: 10, abj: 28 }
  const ancho = VW - M.izq - M.der
  const anchoGrupo = grupos.length ? ancho / grupos.length : ancho
  const anchoBarra = Math.max(2, Math.min(28, (anchoGrupo - 6) / series.length - 2))
  const Y = (v: number) => M.arr + H - (v / tope) * H
  // Si hay muchos períodos, solo se rotulan algunos.
  const cada = Math.max(1, Math.ceil(grupos.length / 12))

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-pizarra">
        {series.map((s) => (
          <span key={s.clave} className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-[3px]" style={{ background: s.color }} aria-hidden />{s.nombre}
          </span>
        ))}
      </div>
      <div className="relative">
        <svg viewBox={`0 0 ${VW} ${M.arr + H + M.abj}`} className="block h-auto w-full" role="img"
          aria-label={`${series.map((s) => s.nombre).join(' y ')} por período. Los valores están en la tabla.`}>
          {[0, 1, 2, 3, 4].map((k) => {
            const v = (tope / 4) * k
            return (
              <g key={k}>
                <line x1={M.izq} x2={VW - M.der} y1={Y(v)} y2={Y(v)} stroke="var(--color-linea)" strokeWidth={1} />
                <text x={M.izq - 6} y={Y(v) + 4} textAnchor="end" fontSize={11} fill="var(--color-pizarra-suave)">{eje(v)}</text>
              </g>
            )
          })}
          {grupos.map((g, i) => {
            const x0 = M.izq + i * anchoGrupo + (anchoGrupo - series.length * (anchoBarra + 2)) / 2
            return (
              <g key={g.clave} opacity={foco !== null && foco !== i ? 0.45 : 1}>
                {series.map((s, j) => {
                  const v = valor(i, s.clave)
                  const y = Y(v)
                  return v > 0 && <path key={s.clave} d={barraRedondeada(x0 + j * (anchoBarra + 2), y, anchoBarra, M.arr + H - y)} fill={s.color} />
                })}
                {i % cada === 0 && (
                  <text x={M.izq + i * anchoGrupo + anchoGrupo / 2} y={M.arr + H + 17} textAnchor="middle" fontSize={11} fill="var(--color-pizarra-suave)">{g.nombre}</text>
                )}
                <rect x={M.izq + i * anchoGrupo} y={0} width={anchoGrupo} height={M.arr + H + M.abj} fill="transparent"
                  onPointerEnter={() => setFoco(i)} onPointerDown={() => setFoco(i)} onPointerLeave={() => setFoco(null)} />
              </g>
            )
          })}
        </svg>
        {foco !== null && grupos[foco] && (
          <div className="pointer-events-none absolute top-0 rounded-lg border border-linea bg-white px-3 py-2 text-sm shadow-[0_4px_16px_rgba(18,38,32,0.15)]"
            style={(foco + 0.5) / grupos.length > 0.6 ? { right: `${100 - ((foco + 0.5) / grupos.length) * 100}%` } : { left: `${((foco + 0.5) / grupos.length) * 100}%` }}>
            <div className="font-bold">{grupos[foco].nombre}</div>
            {series.map((s) => (
              <div key={s.clave} className="flex items-center gap-2 tabular-nums">
                <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                <span className="text-pizarra-suave">{s.nombre}</span>
                <span className="ml-auto pl-3 font-semibold">{unidad(valor(foco, s.clave))}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/** Barra con las puntas de arriba redondeadas (4px) y la base recta sobre el eje. */
function barraRedondeada(x: number, y: number, w: number, h: number) {
  const r = Math.min(4, w / 2, h)
  return `M${x} ${y + h} V${y + r} Q${x} ${y} ${x + r} ${y} H${x + w - r} Q${x + w} ${y} ${x + w} ${y + r} V${y + h} Z`
}

/** Paso del eje: 1, 2 o 5 por una potencia de 10, para unas 4 líneas. */
export function escalaBonita(max: number) {
  if (max <= 0) return 1
  const bruto = max / 4
  const p = 10 ** Math.floor(Math.log10(bruto))
  const n = bruto / p
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p
}
