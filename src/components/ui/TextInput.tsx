import type { InputHTMLAttributes } from 'react'
import { cx } from '../../lib/cx'

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  error?: string | false
}

export function TextInput({ error, className, id, ...props }: Props) {
  return (
    <input
      id={id}
      aria-invalid={error ? true : undefined}
      aria-describedby={error && id ? `${id}-error` : undefined}
      className={cx(
        'h-14 w-full min-w-0 rounded-[10px] bg-white px-4 text-lg',
        error ? 'border-2 border-peligro' : 'border border-verde-salvia focus:border-esmeralda',
        className,
      )}
      {...props}
    />
  )
}
