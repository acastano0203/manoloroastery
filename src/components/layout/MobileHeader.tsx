import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../ui/Icon'
import { MobileDrawer } from './MobileDrawer'
import { useEncabezado } from './useEncabezado'

/** Barra superior del celular con menú hamburguesa (oculta desde md). */
export function MobileHeader() {
  const { titulo, volverA } = useEncabezado()
  const [abierto, setAbierto] = useState(false)
  const cerrar = useCallback(() => setAbierto(false), [])

  return (
    <>
      <header className="sticky top-0 z-[5] flex h-16 items-center gap-1 border-b border-linea bg-white pl-1 pr-3 md:hidden">
        <button type="button" onClick={() => setAbierto(true)} aria-label="Abrir menú" aria-expanded={abierto}
          className="flex h-12 w-12 items-center justify-center rounded-[10px]">
          <Icon name="menu" size={24} />
        </button>
        {volverA && (
          <Link to={volverA} aria-label="Volver" className="flex h-12 w-11 items-center justify-center rounded-[10px] text-bosque">
            <Icon name="atras" size={24} />
          </Link>
        )}
        <img src="/logo.png" alt="Don Manolo" width={40} height={40} className="block h-10 w-10 shrink-0 rounded-full border-2 border-verde-olivo" />
        <div className="ml-2 min-w-0 flex-1 truncate text-lg font-bold">{titulo}</div>
      </header>
      {abierto && <MobileDrawer onCerrar={cerrar} />}
    </>
  )
}
