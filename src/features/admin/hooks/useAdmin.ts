import { useCallback, useEffect, useState } from 'react'
import { mensajeError } from '../../../lib/errores'
import { suscribirCambios } from '../../../lib/realtime'
import { listarPerfiles, listarRoles } from '../services/adminService'
import type { Perfil, Rol } from '../types'

/** Roles y usuarios para la pantalla de administración. */
export function useAdmin() {
  const [roles, setRoles] = useState<Rol[]>([])
  const [perfiles, setPerfiles] = useState<Perfil[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  const recargar = useCallback(async () => {
    try {
      const [rs, ps] = await Promise.all([listarRoles(), listarPerfiles()])
      setRoles(rs)
      setPerfiles(ps)
    } catch (e) {
      setError(mensajeError(e))
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    void recargar()
    const fines = [suscribirCambios('perfiles', recargar), suscribirCambios('roles', recargar), suscribirCambios('rol_permisos', recargar)]
    return () => fines.forEach((f) => f())
  }, [recargar])

  /** Corre la acción, deja el mensaje (bien o mal) y recarga. Devuelve si salió bien. */
  const ejecutar = useCallback(async (accion: () => Promise<void>, exito?: string) => {
    setOk(null)
    try {
      await accion()
      setError(null)
      if (exito) setOk(exito)
      return true
    } catch (e) {
      setError(mensajeError(e))
      return false
    } finally {
      await recargar()
    }
  }, [recargar])

  return { roles, perfiles, cargando, error, ok, setError, setOk, ejecutar }
}

export type AdminApi = ReturnType<typeof useAdmin>
