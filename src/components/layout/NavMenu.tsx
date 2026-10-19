import { Link, useLocation } from 'react-router-dom'
import { cx } from '../../lib/cx'
import { usePermisos } from '../../features/admin/hooks/usePermisos'
import { Icon, type IconName } from '../ui/Icon'

type Permisos = ReturnType<typeof usePermisos>

const ITEMS: Array<{ to: string; label: string; icon: IconName; activo: (path: string) => boolean; ve: (u: Permisos) => boolean }> = [
  { to: '/', label: 'Registros', icon: 'lista', activo: (p) => p === '/' || (p.startsWith('/registros/') && !p.endsWith('/editar')), ve: (u) => u.veLotes },
  { to: '/nuevo', label: 'Nuevo lote', icon: 'nuevo', activo: (p) => p === '/nuevo' || p.endsWith('/editar'), ve: (u) => u.puede('nuevo_lote') },
  { to: '/clientes', label: 'Clientes', icon: 'usuarios', activo: (p) => p.startsWith('/clientes'), ve: (u) => u.puede('clientes') },
  { to: '/configuracion', label: 'Configuración', icon: 'config', activo: (p) => p.startsWith('/configuracion'), ve: (u) => u.puede('configuracion') },
  { to: '/administracion', label: 'Administración', icon: 'escudo', activo: (p) => p.startsWith('/administracion'), ve: (u) => u.esAdmin },
]

export function NavMenu({ onNavegar }: { onNavegar?: () => void }) {
  const { pathname } = useLocation()
  const permisos = usePermisos()
  return (
    <nav className="flex flex-col gap-1">
      {ITEMS.filter((it) => it.ve(permisos)).map((it) => {
        const on = it.activo(pathname)
        return (
          <Link
            key={it.to}
            to={it.to}
            onClick={onNavegar}
            aria-current={on ? 'page' : undefined}
            className={cx(
              'flex h-[52px] w-full items-center gap-3 rounded-[10px] px-3.5 text-base no-underline',
              on ? 'bg-esmeralda/10 font-bold text-esmeralda-oscuro shadow-[inset_0_0_0_1px_var(--color-esmeralda)] [&_svg]:text-esmeralda' : 'font-medium text-pizarra hover:bg-rocio-claro',
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
