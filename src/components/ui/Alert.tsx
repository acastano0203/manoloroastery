import type { ReactNode } from 'react'
import { cx } from '../../lib/cx'
import { Icon } from './Icon'

export type AlertKind = 'ok' | 'error' | 'neutral'

const colores: Record<AlertKind, string> = {
  ok: 'bg-green-100 text-green-800',
  error: 'bg-red-100 text-red-800',
  neutral: 'bg-arena text-cafe',
}

interface Props {
  kind: AlertKind
  children: ReactNode
  onClose?: () => void
  action?: ReactNode
  className?: string
}

/** Aviso con role="status". Opcionalmente con acción y botón de cerrar. */
export function Alert({ kind, children, onClose, action, className }: Props) {
  return (
    <div
      role="status"
      className={cx(
        'flex flex-wrap items-center justify-between gap-3 rounded-[10px] py-2 pl-4 pr-2 text-[15px] font-semibold',
        !onClose && !action && 'py-3 pr-4',
        colores[kind],
        className,
      )}
    >
      <span>{children}</span>
      {(action || onClose) && (
        <div className="flex items-center gap-2">
          {action}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar aviso"
              className="flex h-11 w-11 items-center justify-center rounded-lg"
            >
              <Icon name="cerrar" size={18} />
            </button>
          )}
        </div>
      )}
    </div>
  )
}
