import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { mensajeError } from '../../../lib/errores'
import { suscribirCambios } from '../../../lib/realtime'
import { useAuth } from '../../auth/hooks/useAuth'
import { listarPerfiles, listarRoles } from '../services/adminService'
import type { Perfil, Permiso, Rol } from '../types'

interface PermisosValue {
  cargando: boolean
  error: string | null
  perfil: Perfil | null
  rol: Rol | null
  esAdmin: boolean
  /** Si el usuario puede ver esa pantalla (el administrador puede todo). */
  puede: (p: Permiso) => boolean
  /** Si ve lotes por algún lado (tablero, historial, nuevo lote o curvas). */
  veLotes: boolean
}

const PermisosContext = createContext<PermisosValue | null>(null)

/** Rol y permisos del usuario con sesión. Se actualiza solo si el administrador los cambia. */
export function PermisosProvider({ children }: { children: ReactNode }) {
  const { sesion } = useAuth()
  const uid = sesion?.user.id
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [roles, setRoles] = useState<Rol[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const recargar = useCallback(async () => {
    try {
      const [perfiles, rs] = await Promise.all([listarPerfiles(), listarRoles()])
      setPerfil(perfiles.find((p) => p.id === uid) ?? null)
      setRoles(rs)
      setError(null)
    } catch (e) {
      setError(mensajeError(e))
    } finally {
      setCargando(false)
    }
  }, [uid])

  useEffect(() => {
    void recargar()
    const fines = [suscribirCambios('perfiles', recargar), suscribirCambios('roles', recargar), suscribirCambios('rol_permisos', recargar)]
    return () => fines.forEach((f) => f())
  }, [recargar])

  const valor = useMemo<PermisosValue>(() => {
    const rol = roles.find((r) => r.id === perfil?.rolId) ?? null
    const esAdmin = Boolean(rol?.administrador)
    const puede = (p: Permiso) => esAdmin || Boolean(rol?.permisos.includes(p))
    return {
      cargando, error, perfil, rol, esAdmin, puede,
      veLotes: puede('tablero') || puede('historial') || puede('nuevo_lote') || puede('curvas'),
    }
  }, [cargando, error, perfil, roles])

  return <PermisosContext.Provider value={valor}>{children}</PermisosContext.Provider>
}

export function usePermisos() {
  const ctx = useContext(PermisosContext)
  if (!ctx) throw new Error('usePermisos debe usarse dentro de <PermisosProvider>')
  return ctx
}
