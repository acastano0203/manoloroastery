import type { ReactNode } from 'react'
import { cx } from '../../lib/cx'
import { FieldError } from './FieldError'

interface Props {
  label: string
  htmlFor: string
  error?: string | false
  hint?: string
  className?: string
  children: ReactNode
}

/** Etiqueta + campo + ayuda + error. */
export function Field({ label, htmlFor, error, hint, className, children }: Props) {
  return (
    <div className={cx('flex flex-col gap-2', className)}>
      <label htmlFor={htmlFor} className="text-[15px] font-semibold">
        {label}
      </label>
      {children}
      {hint && <p className="m-0 text-sm text-cafe-suave">{hint}</p>}
      {error && <FieldError id={`${htmlFor}-error`}>{error}</FieldError>}
    </div>
  )
}
