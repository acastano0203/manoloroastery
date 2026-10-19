import { cx } from '../../lib/cx'
import { Icon } from './Icon'

interface Props {
  pagina: number
  paginas: number
  /** Posición del primer y último elemento mostrado, y el total. */
  desde: number
  hasta: number
  total: number
  onCambiar: (pagina: number) => void
  /** [singular, plural]: ['lote', 'lotes'] */
  nombre: readonly [string, string]
}

/** Números a mostrar: siempre la primera, la última y las vecinas de la actual; "…" en los saltos. */
function numeros(pagina: number, paginas: number): Array<number | '…'> {
  const set = new Set([1, paginas, pagina - 1, pagina, pagina + 1].filter((n) => n >= 1 && n <= paginas))
  const orden = [...set].sort((a, b) => a - b)
  const out: Array<number | '…'> = []
  orden.forEach((n, i) => {
    if (i && n - orden[i - 1] > 1) out.push('…')
    out.push(n)
  })
  return out
}

/** Paginación: "Mostrando 11–20 de 47 lotes" y Anterior / números / Siguiente. */
export function Paginacion({ pagina, paginas, desde, hasta, total, onCambiar, nombre }: Props) {
  if (total === 0) return null
  const boton = 'flex h-11 min-w-11 items-center justify-center rounded-lg px-3 text-[15px] font-semibold disabled:opacity-40'
  return (
    <nav aria-label={`Páginas de ${nombre[1]}`} className="flex flex-wrap items-center justify-between gap-3">
      <span className="text-[15px] text-pizarra-suave tabular-nums" aria-live="polite">
        Mostrando {desde}–{hasta} de {total} {total === 1 ? nombre[0] : nombre[1]}
      </span>
      {paginas > 1 && (
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => onCambiar(pagina - 1)} disabled={pagina === 1} aria-label="Página anterior"
            className={cx(boton, 'border border-linea-oscuro bg-white')}>
            <Icon name="atras" size={18} />
          </button>
          {numeros(pagina, paginas).map((n, i) => n === '…' ? (
            <span key={`s${i}`} className="px-1 text-pizarra-suave" aria-hidden>…</span>
          ) : (
            <button key={n} type="button" onClick={() => onCambiar(n)} aria-label={`Página ${n}`} aria-current={n === pagina ? 'page' : undefined}
              className={cx(boton, 'tabular-nums', n === pagina ? 'bg-esmeralda text-white' : 'border border-linea-oscuro bg-white text-pizarra hover:bg-rocio-claro')}>
              {n}
            </button>
          ))}
          <button type="button" onClick={() => onCambiar(pagina + 1)} disabled={pagina === paginas} aria-label="Página siguiente"
            className={cx(boton, 'border border-linea-oscuro bg-white')}>
            <Icon name="adelante" size={18} />
          </button>
        </div>
      )}
    </nav>
  )
}
