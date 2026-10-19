import { useId, useState, type PointerEvent } from 'react'
import { dec } from '../../../lib/format'
import { COLORES } from '../colores'
import type { Lectura, Tostion } from '../types'
import { mmss } from '../utils'

interface Props {
  t: Pick<Tostion, 'crackSeg' | 'descargaSeg'>
  /** Lecturas ya completas (aire y llama arrastrados), en orden. */
  lecturas: Lectura[]
  /** Último minuto del eje x. */
  minutos: number
}

// Medidas en unidades del viewBox; el SVG se estira al ancho disponible.
const VW = 640, M = { izq: 40, der: 64, arr: 22, abj: 26 }, HT = 240, HA = 92
const ancho = VW - M.izq - M.der

/** Curva de temperatura (grano y tambor) y, debajo, aire y llama. Al pasar el dedo o el mouse muestra los valores de ese minuto. */
export function CurvaGrafica({ t, lecturas, minutos }: Props) {
  const idTitulo = useId()
  const [foco, setFoco] = useState<Lectura | null>(null)

  const temps = lecturas.flatMap((l) => [l.tempGrano, l.tempTambor]).filter((v): v is number => v !== null)
  const tMin = temps.length ? Math.max(0, Math.floor(Math.min(...temps) / 50) * 50 - 50) : 0
  const tMax = temps.length ? Math.max(250, Math.ceil(Math.max(...temps) / 50) * 50) : 250
  const X = (seg: number) => M.izq + (seg / 60 / minutos) * ancho
  const Y = (v: number) => M.arr + HT - ((v - tMin) / (tMax - tMin)) * HT
  const yA0 = M.arr + HT + M.abj + 30
  const A = (v: number) => yA0 + HA - (v / 100) * HA
  const alto = yA0 + HA + 22

  const serie = (k: 'tempGrano' | 'tempTambor') =>
    lecturas.filter((l) => l[k] !== null).map((l) => [X(l.segundo), Y(l[k]!)] as const)
  const escalon = (k: 'aire' | 'llama') => {
    const pts: Array<readonly [number, number]> = []
    for (const l of lecturas) {
      if (l[k] === null) continue
      if (pts.length) pts.push([X(l.segundo), pts[pts.length - 1][1]])
      pts.push([X(l.segundo), A(l[k]!)])
    }
    const fin = t.descargaSeg ?? lecturas[lecturas.length - 1]?.segundo
    if (pts.length && fin !== undefined) pts.push([X(fin), pts[pts.length - 1][1]])
    return pts
  }
  const camino = (pts: ReadonlyArray<readonly [number, number]>) => pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')

  const grano = serie('tempGrano'), tambor = serie('tempTambor')
  const ultimo = (k: 'tempGrano' | 'tempTambor') => [...lecturas].reverse().find((l) => l[k] !== null)

  function mover(e: PointerEvent<SVGRectElement>) {
    if (!lecturas.length) return
    const caja = e.currentTarget.ownerSVGElement!.getBoundingClientRect()
    const x = ((e.clientX - caja.left) / caja.width) * VW
    const seg = ((x - M.izq) / ancho) * minutos * 60
    setFoco(lecturas.reduce((a, b) => (Math.abs(b.segundo - seg) < Math.abs(a.segundo - seg) ? b : a)))
  }

  const pasoMin = minutos > 15 ? 2 : 1
  const marcas = [[t.crackSeg, '1er crack', 0], [t.descargaSeg, 'Descarga', 12]] as const

  return (
    <figure className="m-0 flex flex-col gap-2" aria-labelledby={idTitulo}>
      <figcaption id={idTitulo} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <span className="font-semibold">Curva de temperatura (°C)</span>
        <span className="flex items-center gap-4 text-sm text-pizarra">
          <Leyenda color={COLORES.grano.hex} texto="Grano" />
          <Leyenda color={COLORES.tambor.hex} texto="Tambor" />
          <Leyenda color={COLORES.aire.hex} texto="Aire" />
          <Leyenda color={COLORES.llama.hex} texto="Llama" />
        </span>
      </figcaption>
      <div className="relative">
        <svg viewBox={`0 0 ${VW} ${alto}`} className="block h-auto w-full touch-none select-none" role="img"
          aria-label={`Curva con ${lecturas.length} lecturas. Los valores están en la tabla de lecturas.`}>
          {/* Temperaturas */}
          {Array.from({ length: (tMax - tMin) / 50 + 1 }, (_, i) => tMin + i * 50).map((v) => (
            <g key={v}>
              <line x1={M.izq} x2={VW - M.der} y1={Y(v)} y2={Y(v)} stroke="var(--color-linea)" strokeWidth={1} />
              <text x={M.izq - 6} y={Y(v) + 4} textAnchor="end" fontSize={11} fill="var(--color-pizarra-suave)">{v}</text>
            </g>
          ))}
          {Array.from({ length: Math.floor(minutos / pasoMin) + 1 }, (_, i) => i * pasoMin).map((m) => (
            <text key={m} x={X(m * 60)} y={M.arr + HT + 16} textAnchor="middle" fontSize={11} fill="var(--color-pizarra-suave)">{m}</text>
          ))}
          <text x={M.izq + ancho / 2} y={M.arr + HT + 30} textAnchor="middle" fontSize={10} fill="var(--color-pizarra-suave)">minutos</text>
          {marcas.map(([seg, nombre, dy]) => seg !== null && (
            <g key={nombre}>
              <line x1={X(seg)} x2={X(seg)} y1={M.arr} y2={yA0 + HA} stroke="var(--color-pizarra-suave)" strokeWidth={1} strokeDasharray="4 3" />
              <text x={X(seg) + (X(seg) > VW - M.der - 90 ? -4 : 4)} y={M.arr + 10 + dy} fontSize={11} fontWeight={700}
                textAnchor={X(seg) > VW - M.der - 90 ? 'end' : 'start'} fill="var(--color-pizarra)">{nombre} {mmss(seg)}</text>
            </g>
          ))}
          <path d={camino(tambor)} fill="none" stroke={COLORES.tambor.hex} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          <path d={camino(grano)} fill="none" stroke={COLORES.grano.hex} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {[...tambor.map((p) => ['t', p] as const), ...grano.map((p) => ['g', p] as const)].map(([k, [x, y]]) => (
            <circle key={`${k}${x}`} cx={x} cy={y} r={3.5} fill={k === 'g' ? COLORES.grano.hex : COLORES.tambor.hex} stroke="#fff" strokeWidth={1.5} />
          ))}
          {/* Etiquetas directas al final de cada línea */}
          {(['tempTambor', 'tempGrano'] as const).map((k) => {
            const l = ultimo(k)
            if (!l) return null
            return (
              <text key={k} x={X(l.segundo) + 7} y={Y(l[k]!) + 4} fontSize={11} fontWeight={700} fill="var(--color-bosque)">
                {k === 'tempGrano' ? 'Grano' : 'Tambor'} {dec(l[k]!, 0)}°
              </text>
            )
          })}

          {/* Aire y llama */}
          <text x={M.izq} y={yA0 - 10} fontSize={12} fontWeight={700} fill="var(--color-bosque)">Aire y llama (%)</text>
          {[0, 50, 100].map((v) => (
            <g key={v}>
              <line x1={M.izq} x2={VW - M.der} y1={A(v)} y2={A(v)} stroke="var(--color-linea)" strokeWidth={1} />
              <text x={M.izq - 6} y={A(v) + 4} textAnchor="end" fontSize={11} fill="var(--color-pizarra-suave)">{v}</text>
            </g>
          ))}
          <path d={camino(escalon('aire'))} fill="none" stroke={COLORES.aire.hex} strokeWidth={2} />
          <path d={camino(escalon('llama'))} fill="none" stroke={COLORES.llama.hex} strokeWidth={2} />

          {/* Mira y zona para pasar el dedo o el mouse (más grande que las marcas) */}
          {foco && <line x1={X(foco.segundo)} x2={X(foco.segundo)} y1={M.arr} y2={yA0 + HA} stroke="var(--color-bosque)" strokeWidth={1} />}
          <rect x={M.izq} y={0} width={ancho} height={alto} fill="transparent"
            onPointerMove={mover} onPointerDown={mover} onPointerLeave={() => setFoco(null)} />
        </svg>
        {foco && (
          <div className="pointer-events-none absolute top-2 rounded-lg border border-linea bg-white px-3 py-2 text-sm shadow-[0_4px_16px_rgba(18,38,32,0.15)]"
            style={X(foco.segundo) / VW > 0.6 ? { right: `${100 - (X(foco.segundo) / VW) * 100 + 2}%` } : { left: `${(X(foco.segundo) / VW) * 100 + 2}%` }}>
            <div className="font-bold tabular-nums">Minuto {mmss(foco.segundo)}</div>
            <Fila color={COLORES.grano.hex} k="Grano" v={foco.tempGrano === null ? '—' : `${dec(foco.tempGrano, 1)} °C`} />
            <Fila color={COLORES.tambor.hex} k="Tambor" v={foco.tempTambor === null ? '—' : `${dec(foco.tempTambor, 1)} °C`} />
            <Fila color={COLORES.aire.hex} k="Aire" v={foco.aire === null ? '—' : `${foco.aire} %`} />
            <Fila color={COLORES.llama.hex} k="Llama" v={foco.llama === null ? '—' : `${foco.llama} %`} />
          </div>
        )}
      </div>
    </figure>
  )
}

function Leyenda({ color, texto }: { color: string; texto: string }) {
  return <span className="flex items-center gap-1.5"><span className="h-[3px] w-4 rounded-full" style={{ background: color }} />{texto}</span>
}

function Fila({ color, k, v }: { color: string; k: string; v: string }) {
  return (
    <div className="flex items-center gap-2 tabular-nums">
      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
      <span className="text-pizarra-suave">{k}</span>
      <span className="ml-auto pl-3 font-semibold">{v}</span>
    </div>
  )
}
