import type { ReactNode } from 'react'
import { Icon } from './Icon'

export function FieldError({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <p id={id} className="m-0 flex items-center gap-1.5 text-[15px] font-medium text-peligro">
      <Icon name="error" size={18} />
      {children}
    </p>
  )
}
