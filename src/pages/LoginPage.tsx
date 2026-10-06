import { Navigate } from 'react-router-dom'
import { LoginForm } from '../features/auth/components/LoginForm'
import { useAuth } from '../features/auth/hooks/useAuth'

export function LoginPage() {
  const { sesion, cargando } = useAuth()
  if (!cargando && sesion) return <Navigate to="/" replace />
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="flex w-full max-w-[420px] flex-col items-center gap-6 rounded-[14px] border border-arena bg-white p-6 sm:p-8">
        <img src="/logo.png" alt="Don Manolo" width={112} height={112} className="h-28 w-28 rounded-full border-[3px] border-dorado" />
        <div className="text-center">
          <h1 className="m-0 text-2xl font-bold">Registro de tostión</h1>
          <p className="m-0 mt-1 text-[15px] text-cafe-suave">Entra con la cuenta del equipo.</p>
        </div>
        <LoginForm />
      </div>
    </main>
  )
}
