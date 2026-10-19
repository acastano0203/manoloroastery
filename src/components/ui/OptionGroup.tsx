import { useId } from 'react'
import { cx } from '../../lib/cx'

interface Props<T extends string> {
  label: string
  options: readonly T[]
  value: T | null
  onChange: (valor: T) => void
  /** Botones más altos (forma de pago). */
  big?: boolean
  /** Clases de grilla, ej. "grid-cols-2 max-w-80". */
  gridClassName?: string
  labelClassName?: string
  optionLabel?: (valor: T) => string
}

/** Grupo de botones donde solo uno queda presionado (reemplaza radios). */
export function OptionGroup<T extends string>({
  label, options, value, onChange, big, gridClassName = 'grid-cols-2', labelClassName, optionLabel,
}: Props<T>) {
  const id = useId()
  return (
    <div className="flex flex-col gap-2">
      <div id={id} className={cx('text-[15px] font-semibold', labelClassName)}>{label}</div>
      <div role="group" aria-labelledby={id} className={cx('grid gap-2', gridClassName)}>
        {options.map((op) => {
          const on = op === value
          return (
            <button
              key={op}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(op)}
              className={cx(
                'rounded-xl border-2 px-3 font-bold text-bosque',
                big ? 'h-16 text-lg' : 'h-14 text-[17px]',
                on ? 'border-esmeralda bg-esmeralda/15' : 'border-linea-oscuro bg-white hover:bg-rocio-claro',
              )}
            >
              {optionLabel ? optionLabel(op) : op}
            </button>
          )
        })}
      </div>
    </div>
  )
}
