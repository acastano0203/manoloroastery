import type { Session } from '@supabase/supabase-js'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { cerrarSesion, escucharSesion, iniciarSesion, obtenerSesion } from '../services/authService'

interface AuthValue {
  sesion: Session | null
  cargando: boolean
  entrar: (correo: string, clave: string) => Promise<void>
  salir: () => Promise<void>
}

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sesion, setSesion] = useState<Session | null>(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    obtenerSesion().then((s) => {
      setSesion(s)
      setCargando(false)
    })
    return escucharSesion(setSesion)
  }, [])

  return (
    <AuthContext.Provider value={{ sesion, cargando, entrar: iniciarSesion, salir: cerrarSesion }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
