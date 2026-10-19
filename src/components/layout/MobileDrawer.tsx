import { useEffect } from 'react'
import { HoyTarjetaLateral } from '../../features/registros/components/HoyTarjetaLateral'
import { Icon } from '../ui/Icon'
import { NavMenu } from './NavMenu'
import { SalirButton } from './SalirButton'

/** Menú deslizable del celular. */
export function MobileDrawer({ onCerrar }: { onCerrar: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCerrar()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCerrar])

  return (
    <div className="fixed inset-0 z-20 flex md:hidden">
      <aside aria-label="Menú principal"
        className="flex h-full w-[280px] max-w-[85vw] flex-col gap-5 overflow-y-auto bg-white px-4 py-5 shadow-[4px_0_24px_rgba(18,38,32,0.25)]">
        <div className="flex items-start justify-between">
          <img src="/logo.png" alt="Don Manolo" width={88} height={88} className="block h-[88px] w-[88px] rounded-full border-[3px] border-verde-olivo" />
          <button type="button" onClick={onCerrar} aria-label="Cerrar menú" className="flex h-12 w-12 items-center justify-center rounded-[10px]">
            <Icon name="cerrar" size={24} />
          </button>
        </div>
        <NavMenu onNavegar={onCerrar} />
        <HoyTarjetaLateral />
        <SalirButton />
      </aside>
      <button type="button" onClick={onCerrar} aria-label="Cerrar menú" className="flex-1 bg-[rgba(18,38,32,0.45)]" />
    </div>
  )
}
