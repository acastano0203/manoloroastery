import { useEffect, useState } from 'react'
import { Alert, type AlertKind } from '../../../components/ui/Alert'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import { Loading } from '../../../components/ui/Loading'
import { PageHeading } from '../../../components/ui/PageHeading'
import { mensajeError } from '../../../lib/errores'
import { miles } from '../../../lib/format'
import { useConfig } from '../hooks/useConfig'
import { PrecioInput } from './PrecioInput'
import { SiigoAjustes } from './SiigoAjustes'
import { SiigoConexion } from './SiigoConexion'

const num = (v: string) => Number(v.replace(/\D/g, '')) || 0

/**
 * Configuración: el precio por libra de tostión y la conexión con Siigo.
 * Las bolsas y drips (referencias, precios e inventario) salen de Siigo: se eligen en cada lote.
 */
export function ConfigForm() {
  const { config, error, guardar } = useConfig()
  const [lb, setLb] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ kind: AlertKind; text: string } | null>(null)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (config && lb === null) setLb(miles(config.precios.lb))
  }, [config, lb])

  if (error && !config) return <main className="p-6"><Alert kind="error">{error}</Alert></main>
  if (!config || lb === null) return <Loading />

  async function onGuardar() {
    if (!config || lb === null) return
    const precio = num(lb)
    if (!precio) return setMsg({ kind: 'error', text: 'El precio por libra debe ser mayor que 0.' })
    setGuardando(true)
    try {
      await guardar({ ...config, precios: { ...config.precios, lb: precio } })
      setMsg({ kind: 'ok', text: 'Precio guardado. Aplica a los lotes nuevos.' })
    } catch (e) {
      setMsg({ kind: 'error', text: mensajeError(e) })
    } finally {
      setGuardando(false)
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-[720px] flex-1 flex-col gap-6 px-4 pb-12 pt-6">
      <PageHeading title="Configuración" />
      <Card title="Precio de la tostión" className="gap-[18px]">
        <div className="max-w-[260px]">
          <PrecioInput id="plb" label="Precio por libra de tostión" value={lb} onChange={(v) => { setLb(v); setMsg(null) }} />
        </div>
        <p className="m-0 text-sm text-pizarra-suave">Las bolsas y drips se eligen en cada lote de los productos de Siigo, con su precio e inventario de Siigo.</p>
        <Button size="xl" onClick={onGuardar} disabled={guardando} className="font-bold">
          {guardando ? 'Guardando…' : 'Guardar precio'}
        </Button>
        {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}
      </Card>
      <SiigoConexion />
      <SiigoAjustes config={config} />
    </main>
  )
}
