import type { ReactNode } from 'react'
import { cx } from '../../lib/cx'

const trazos = {
  lista: <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />,
  nuevo: <><circle cx="12" cy="12" r="9" /><path d="M12 8v8M8 12h8" /></>,
  usuarios: <><circle cx="9" cy="8" r="4" /><path d="M2 21v-1a6 6 0 0 1 6-6h2a6 6 0 0 1 6 6v1M16 4a4 4 0 0 1 0 8M22 21v-1a6 6 0 0 0-4-5.7" /></>,
  config: <><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" /></>,
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  atras: <path d="M15 18l-6-6 6-6" />,
  cerrar: <path d="M6 6l12 12M18 6L6 18" />,
  buscar: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
  abajo: <path d="M6 9l6 6 6-6" />,
  mas: <path d="M12 5v14M5 12h14" />,
  menos: <path d="M5 12h14" />,
  editar: <path d="M4 20h4L19 9l-4-4L4 16z" />,
  eliminar: <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />,
  compartir: <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v13" />,
  enviar: <path d="M22 2L11 13M22 2l-7 20-4-9-9-4z" />,
  descargar: <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />,
  whatsapp: <path d="M21 12a9 9 0 0 1-13.2 8L3 21l1-4.6A9 9 0 1 1 21 12z" />,
  error: <><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></>,
  aviso: <><path d="M12 3l9.5 17h-19z" /><path d="M12 10v4M12 17h.01" /></>,
  enchufe: <path d="M9 7V3M15 7V3M6 7h12v4a6 6 0 0 1-12 0zM12 17v4" />,
  salir: <path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 17l5-5-5-5M15 12H3" />,
} satisfies Record<string, ReactNode>

export type IconName = keyof typeof trazos

interface Props {
  name: IconName
  size?: number
  className?: string
}

/** Íconos de trazo del diseño (heredan el color del texto). */
export function Icon({ name, size = 22, className }: Props) {
  return (
    <svg
      className={cx('shrink-0', className)}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {trazos[name]}
    </svg>
  )
}
