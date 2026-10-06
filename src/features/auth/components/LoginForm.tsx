import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Alert } from '../../../components/ui/Alert'
import { Button } from '../../../components/ui/Button'
import { Field } from '../../../components/ui/Field'
import { TextInput } from '../../../components/ui/TextInput'
import { useAuth } from '../hooks/useAuth'

export function LoginForm() {
  const { entrar } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [correo, setCorreo] = useState('')
  const [clave, setClave] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setEnviando(true)
    try {
      await entrar(correo, clave)
      const desde = (location.state as { desde?: string } | null)?.desde
      navigate(desde && desde !== '/login' ? desde : '/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full flex-col gap-5">
      <Field label="Correo" htmlFor="correo">
        <TextInput id="correo" type="email" autoComplete="email" required value={correo} onChange={(e) => setCorreo(e.target.value)} />
      </Field>
      <Field label="Contraseña" htmlFor="clave">
        <TextInput id="clave" type="password" autoComplete="current-password" required value={clave} onChange={(e) => setClave(e.target.value)} />
      </Field>
      {error && <Alert kind="error">{error}</Alert>}
      <Button type="submit" size="xxl" disabled={enviando} className="font-bold">
        {enviando ? 'Entrando…' : 'Entrar'}
      </Button>
    </form>
  )
}
