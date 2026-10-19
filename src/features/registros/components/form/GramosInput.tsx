import type { ReactNode } from 'react'
import { FieldError } from '../../../../components/ui/FieldError'
import { Icon } from '../../../../components/ui/Icon'
import { cx } from '../../../../lib/cx'

interface Props {
  id: string
  value: string
  onChange: (valor: string) => void
  onBlur?: () => void
  error?: string | false
  /** Aviso que no bloquea (ej. más gramos de los recibidos). */
  aviso?: string | null
  /** "1,50 lb" */
  librasTxt?: string
  autoFocus?: boolean
  /** Debajo de la equivalencia (ej. la merma de trilla). */
  children?: ReactNode
}

/** Panel grande del café a tostar: su peso en almendra (café verde) en gramos, con la equivalencia en libras. */
export function GramosInput({ id, value, onChange, onBlur, error, aviso, librasTxt, autoFocus, children }: Props) {
  return (
    <div className="flex flex-col gap-2.5 rounded-[14px] border-2 border-verde-salvia bg-panel p-4 sm:p-5">
      <label htmlFor={id} className="text-lg font-bold text-esmeralda-oscuro">Peso en almendra (café verde)</label>
      <div className="relative">
        <input id={id} inputMode="numeric" placeholder="0" value={value} autoFocus={autoFocus}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={(e) => onChange(e.target.value)} onBlur={onBlur}
          className={cx('h-[72px] w-full rounded-xl bg-white pl-5 pr-12 text-[32px] font-bold tabular-nums border-2',
            error ? 'border-peligro' : 'border-verde-salvia focus:border-esmeralda')} />
        <span className="pointer-events-none absolute right-5 top-5 text-[22px] font-semibold text-pizarra-suave">g</span>
      </div>
      {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
      {aviso && (
        <p className="m-0 flex items-center gap-1.5 text-[15px] font-medium text-amber-800">
          <Icon name="aviso" size={18} />
          {aviso}
        </p>
      )}
      <div className="text-[15px] text-pizarra-suave">
        Equivale a <strong className="text-bosque">{librasTxt ?? '—'}</strong> para tostar
      </div>
      {children}
    </div>
  )
}
