import { useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import { Field } from '../../../components/ui/Field'
import { Icon } from '../../../components/ui/Icon'
import { TextInput } from '../../../components/ui/TextInput'
import { cx } from '../../../lib/cx'
import { probarConexionSiigo } from '../services/siigoService'
import type { EstadoConexion } from '../types'

const ESTADOS: Record<EstadoConexion, { label: string; badge: string; punto: string }> = {
  sin: { label: 'Sin probar', badge: 'bg-rocio-claro text-pizarra', punto: 'bg-verde-salvia' },
  probando: { label: 'Probando…', badge: 'bg-amber-100 text-amber-800', punto: 'bg-amber-600' },
  ok: { label: 'Conectado', badge: 'bg-verde-menta text-verde-botella', punto: 'bg-verde-hoja' },
  error: { label: 'Sin conexión', badge: 'bg-red-100 text-red-800', punto: 'bg-peligro' },
}

interface Props {
  usuario: string
  onUsuario: (v: string) => void
}

/** Usuario API (se guarda) y llave de acceso (solo para probar; nunca se guarda en el navegador ni en la tabla). */
export function SiigoConexion({ usuario, onUsuario }: Props) {
  const [llave, setLlave] = useState('')
  const [ver, setVer] = useState(false)
  const [estado, setEstado] = useState<EstadoConexion>('sin')
  const [error, setError] = useState<string | null>(null)
  const e = ESTADOS[estado]

  async function probar() {
    setEstado('probando')
    setError(null)
    try {
      await probarConexionSiigo(usuario, llave)
      setEstado('ok')
    } catch (err) {
      setEstado('error')
      setError(err instanceof Error ? err.message : 'No se pudo conectar.')
    }
  }

  return (
    <Card className="gap-[18px]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="m-0 text-lg font-bold">Conexión con Siigo</h2>
        <span role="status" className={cx('inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold', e.badge)}>
          <span className={cx('h-2.5 w-2.5 rounded-full', e.punto)} />
          {e.label}
        </span>
      </div>
      <Field label="Usuario API" htmlFor="usr">
        <TextInput id="usr" type="email" autoComplete="off" placeholder="usuario@empresa.com" value={usuario}
          onChange={(ev) => { onUsuario(ev.target.value); setEstado('sin') }} />
      </Field>
      <Field label="Llave de acceso" htmlFor="key">
        <div className="flex gap-2">
          <TextInput id="key" type={ver ? 'text' : 'password'} autoComplete="off" placeholder="Pega la llave de acceso" value={llave}
            onChange={(ev) => { setLlave(ev.target.value); setEstado('sin') }} className="flex-1" />
          <Button variant="outline" size="xl" onClick={() => setVer(!ver)}>{ver ? 'Ocultar' : 'Ver'}</Button>
        </div>
      </Field>
      {error && <p className="m-0 text-[15px] font-medium text-peligro">{error}</p>}
      <Button variant="secondary" size="xl" onClick={probar} disabled={estado === 'probando'}>
        <Icon name="enchufe" size={20} />
        {estado === 'probando' ? 'Probando…' : 'Probar conexión'}
      </Button>
    </Card>
  )
}
