import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from './Icon'

interface Props {
  title: ReactNode
  /** Enlace "volver" que se ve solo en escritorio (en celular está en la barra superior). */
  back?: { to: string; label: string }
  subtitle?: ReactNode
  action?: ReactNode
  /** En celular el título ya está en la barra superior. */
  hideTitleOnMobile?: boolean
}

export function PageHeading({ title, back, subtitle, action, hideTitleOnMobile = true }: Props) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 flex-col items-start gap-1">
        {back && (
          <Link to={back.to} className="hidden min-h-8 items-center gap-1 text-[15px] font-semibold text-vino no-underline md:flex">
            <Icon name="atras" size={18} />
            {back.label}
          </Link>
        )}
        <h1 className={hideTitleOnMobile ? 'm-0 hidden text-3xl font-bold md:block' : 'm-0 text-[28px] font-bold'}>
          {title}
        </h1>
        {subtitle && <div className="text-[15px] text-cafe-suave">{subtitle}</div>}
      </div>
      {action}
    </div>
  )
}
