import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { MobileHeader } from './MobileHeader'
import { Sidebar } from './Sidebar'

/** Menú lateral en escritorio, barra superior en celular, y el contenido de la página. */
export function Layout() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar />
      <MobileHeader />
      <div className="flex min-h-[calc(100vh-4rem)] min-w-0 flex-1 flex-col md:min-h-screen">
        <Outlet />
      </div>
    </div>
  )
}
