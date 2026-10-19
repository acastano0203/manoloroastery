import { cx } from '../../lib/cx'

interface Props {
  on: boolean
  onClick: () => void
  children: string
}

export function Chip({ on, onClick, children }: Props) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cx(
        'h-11 rounded-full border px-4 text-[15px] font-semibold',
        on ? 'border-esmeralda bg-esmeralda/15 text-bosque' : 'border-linea-oscuro bg-white text-pizarra',
      )}
    >
      {children}
    </button>
  )
}
