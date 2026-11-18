import { useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import { Icon } from '../../../components/ui/Icon'
import { cx } from '../../../lib/cx'
import { probarConexionSiigo } from '../services/siigoService'
import type { EstadoConexion } from '../types'

const ESTADOS: Record<EstadoConexion, { label: string; badge: string; punto: string }> = {
  sin: { label: 'Sin probar', badge: 'bg-rocio-claro text-pizarra', punto: 'bg-verde-salvia' },
  probando: { label: 'Probando…', badge: 'bg-amber-100 text-amber-800', punto: 'bg-amber-600' },
  ok: { label: 'Conectado', badge: 'bg-verde-menta text-verde-botella', punto: 'bg-verde-hoja' },
  error: { label: 'Sin conexión', badge: 'bg-red-100 text-red-800', punto: 'bg-peligro' },
}

/**
 * Prueba la conexión con Siigo. El usuario API y la llave de acceso no se escriben aquí:
 * son secretos de Supabase (SIIGO_USUARIO y SIIGO_LLAVE) y solo los usa la función "siigo".
 */
export function SiigoConexion() {
  const [estado, setEstado] = useState<EstadoConexion>('sin')
  const [error, setError] = useState<string | null>(null)
  const e = ESTADOS[estado]

  async function probar() {
    setEstado('probando')
    setError(null)
    try {
      await probarConexionSiigo()
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
      <p className="m-0 text-[15px] text-pizarra-suave">
        El usuario API y la llave de acceso están guardados de forma segura en Supabase; no se escriben ni se ven en la app.
      </p>
      {error && <p className="m-0 text-[15px] font-medium text-peligro">{error}</p>}
      <Button variant="secondary" size="xl" onClick={probar} disabled={estado === 'probando'}>
        <Icon name="enchufe" size={20} />
        {estado === 'probando' ? 'Probando…' : 'Probar conexión'}
      </Button>
    </Card>
  )
}
