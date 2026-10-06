import { useAuth } from '../../features/auth/hooks/useAuth'
import { Icon } from '../ui/Icon'

export function SalirButton() {
  const { sesion, salir } = useAuth()
  return (
    <button
      type="button"
      onClick={() => void salir()}
      className="flex min-h-11 w-full items-center gap-3 rounded-[10px] px-3.5 text-left text-[15px] text-cafe-suave hover:bg-crema-claro"
    >
      <Icon name="salir" size={20} />
      <span className="min-w-0">
        Cerrar sesión
        {sesion?.user.email && <span className="block truncate text-[13px]">{sesion.user.email}</span>}
      </span>
    </button>
  )
}
