import { Link, useLocation } from 'react-router-dom'
import { cx } from '../../lib/cx'
import { Icon, type IconName } from '../ui/Icon'

const ITEMS: Array<{ to: string; label: string; icon: IconName; activo: (path: string) => boolean }> = [
  { to: '/', label: 'Registros', icon: 'lista', activo: (p) => p === '/' || (p.startsWith('/registros/') && !p.endsWith('/editar')) },
  { to: '/nuevo', label: 'Nuevo registro', icon: 'nuevo', activo: (p) => p === '/nuevo' || p.endsWith('/editar') },
  { to: '/clientes', label: 'Clientes', icon: 'usuarios', activo: (p) => p.startsWith('/clientes') },
  { to: '/configuracion', label: 'Configuración', icon: 'config', activo: (p) => p.startsWith('/configuracion') },
]

export function NavMenu({ onNavegar }: { onNavegar?: () => void }) {
  const { pathname } = useLocation()
  return (
    <nav className="flex flex-col gap-1">
      {ITEMS.map((it) => {
        const on = it.activo(pathname)
        return (
          <Link
            key={it.to}
            to={it.to}
            onClick={onNavegar}
            aria-current={on ? 'page' : undefined}
            className={cx(
              'flex h-[52px] w-full items-center gap-3 rounded-[10px] px-3.5 text-base no-underline',
              on ? 'bg-trigo font-bold text-vino shadow-[inset_0_0_0_1px_var(--color-dorado)]' : 'font-medium text-cafe-medio hover:bg-crema-claro',
            )}
          >
            <Icon name={it.icon} />
            {it.label}
          </Link>
        )
      })}
    </nav>
  )
}
