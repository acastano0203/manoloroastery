import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { Alert } from '../../../components/ui/Alert'
import { Loading } from '../../../components/ui/Loading'
import { SalirButton } from '../../../components/layout/SalirButton'
import { usePermisos } from '../hooks/usePermisos'
import type { Permiso } from '../types'

/** Deja pasar solo a usuarios con rol. Sin rol: pantalla para pedirle uno al administrador. */
export function RequiereRol({ children }: { children: ReactNode }) {
  const { cargando, error, rol } = usePermisos()
  if (cargando) return <Loading />
  if (error) return <main className="p-6"><Alert kind="error">{error}</Alert></main>
  if (!rol) {
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <div className="flex w-full max-w-[420px] flex-col items-center gap-4 rounded-2xl border border-linea bg-white p-6 text-center">
          <img src="/logo.png" alt="Don Manolo" width={96} height={96} className="h-24 w-24 rounded-full border-[3px] border-verde-olivo" />
          <h1 className="m-0 text-2xl font-bold">Tu usuario no tiene un rol</h1>
          <p className="m-0 text-[15px] text-pizarra">Pide al administrador que te asigne uno en Administración → Usuarios. Al hacerlo, esta pantalla se actualiza sola.</p>
          <div className="w-full"><SalirButton /></div>
        </div>
      </main>
    )
  }
  return <>{children}</>
}

interface ConPermisoProps {
  /** Necesita este permiso. */
  p?: Permiso
  /** Necesita ver lotes por algún lado. */
  lotes?: boolean
  /** Solo quien puede usar Administración. */
  admin?: boolean
  children: ReactNode
}

/** Muestra la página solo si el rol puede verla. */
export function ConPermiso({ p, lotes, admin, children }: ConPermisoProps) {
  const { puede, veLotes } = usePermisos()
  const ok = admin ? puede('administracion') : lotes ? veLotes : p ? puede(p) : false
  if (ok) return <>{children}</>
  return (
    <main className="mx-auto w-full max-w-[720px] p-6">
      <Alert kind="neutral">Tu rol no tiene acceso a esta pantalla. Si la necesitas, pídesela al administrador.</Alert>
    </main>
  )
}

/** En "/": si el rol no ve lotes, lo lleva a la primera pantalla que sí puede ver. */
export function InicioSegunRol({ children }: { children: ReactNode }) {
  const { veLotes, puede } = usePermisos()
  if (veLotes) return <>{children}</>
  if (puede('reportes')) return <Navigate to="/reportes" replace />
  if (puede('clientes')) return <Navigate to="/clientes" replace />
  if (puede('configuracion')) return <Navigate to="/configuracion" replace />
  if (puede('administracion')) return <Navigate to="/administracion" replace />
  return <ConPermiso lotes>{children}</ConPermiso>
}
