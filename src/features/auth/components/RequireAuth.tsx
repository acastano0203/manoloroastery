import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { Loading } from '../../../components/ui/Loading'
import { useAuth } from '../hooks/useAuth'

export function RequireAuth({ children }: { children: ReactNode }) {
  const { sesion, cargando } = useAuth()
  const location = useLocation()
  if (cargando) return <Loading />
  if (!sesion) return <Navigate to="/login" replace state={{ desde: location.pathname }} />
  return <>{children}</>
}
