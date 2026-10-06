import type { ReactNode } from 'react'
import { cx } from '../../lib/cx'

interface Props {
  title?: string
  children: ReactNode
  className?: string
  ariaLabel?: string
}

export function Card({ title, children, className, ariaLabel }: Props) {
  return (
    <section
      aria-label={ariaLabel}
      className={cx('flex flex-col gap-3.5 rounded-[14px] border border-arena bg-white p-4 sm:p-5', className)}
    >
      {title && <h2 className="m-0 text-[17px] font-bold">{title}</h2>}
      {children}
    </section>
  )
}
