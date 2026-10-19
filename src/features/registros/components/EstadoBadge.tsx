import { cx } from '../../../lib/cx'
import type { Estado } from '../types'

const colores: Record<Estado, string> = {
  Enviado: 'bg-verde-menta text-verde-botella',
  Error: 'bg-red-100 text-red-800',
  Enviando: 'bg-linea text-bosque',
  Pendiente: 'bg-amber-100 text-amber-800',
}

export function EstadoBadge({ estado }: { estado: Estado }) {
  return (
    <span className={cx('inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-sm font-semibold', colores[estado])}>
      {estado === 'Enviando' ? 'Enviando…' : estado}
    </span>
  )
}
