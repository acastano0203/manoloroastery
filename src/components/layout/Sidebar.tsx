import { Link } from 'react-router-dom'
import { HoyTarjetaLateral } from '../../features/registros/components/HoyTarjetaLateral'
import { NavMenu } from './NavMenu'
import { SalirButton } from './SalirButton'

/** Menú lateral fijo (desde md). */
export function Sidebar() {
  return (
    <aside aria-label="Menú principal"
      className="sticky top-0 z-[5] hidden h-screen w-[248px] shrink-0 flex-col gap-6 overflow-y-auto border-r border-arena bg-white px-4 py-6 md:flex">
      <Link to="/" aria-label="Don Manolo, ir a registros" className="flex flex-col items-start gap-2.5 no-underline">
        <img src="/logo.png" alt="Don Manolo" width={112} height={112} className="block h-28 w-28 rounded-full border-[3px] border-dorado" />
        <span className="text-[13px] font-bold tracking-[0.08em] text-cafe-suave">REGISTRO DE TOSTIÓN</span>
      </Link>
      <NavMenu />
      <HoyTarjetaLateral />
      <SalirButton />
    </aside>
  )
}
