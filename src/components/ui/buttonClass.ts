import { cx } from '../../lib/cx'

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'dangerOutline' | 'link'
export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl' | 'xxl'

const variantes: Record<ButtonVariant, string> = {
  primary: 'bg-vino text-white hover:bg-vino-oscuro font-semibold',
  secondary: 'bg-white text-vino border border-vino hover:bg-crema-claro font-bold',
  outline: 'bg-white text-cafe border border-dorado hover:bg-crema-claro font-semibold',
  danger: 'bg-peligro text-white hover:bg-red-800 font-semibold',
  dangerOutline: 'bg-white text-peligro border border-red-200 hover:bg-red-50',
  link: 'bg-transparent text-vino font-semibold hover:underline',
}

const tamanos: Record<ButtonSize, string> = {
  sm: 'min-h-11 px-3.5 text-[15px] rounded-lg',
  md: 'min-h-12 px-4 rounded-[10px]',
  lg: 'min-h-[52px] px-5 rounded-[10px]',
  xl: 'min-h-14 px-5 text-[17px] rounded-[10px]',
  xxl: 'min-h-[60px] px-5 text-lg rounded-xl',
}

/** Clases de botón, también para <a> o <Link> que deben verse como botón. */
export function buttonClass(variant: ButtonVariant = 'primary', size: ButtonSize = 'md', extra?: string) {
  return cx(
    'inline-flex items-center justify-center gap-2 text-center no-underline transition-colors',
    variantes[variant],
    variant === 'link' ? 'min-h-11 px-0 text-[15px]' : tamanos[size],
    extra,
  )
}
