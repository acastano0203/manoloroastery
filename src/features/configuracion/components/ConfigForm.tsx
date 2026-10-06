import { useEffect, useState } from 'react'
import { Alert, type AlertKind } from '../../../components/ui/Alert'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import { Loading } from '../../../components/ui/Loading'
import { PageHeading } from '../../../components/ui/PageHeading'
import { mensajeError } from '../../../lib/errores'
import { miles } from '../../../lib/format'
import { useConfig } from '../hooks/useConfig'
import type { Precios } from '../types'
import { PrecioInput } from './PrecioInput'
import { SiigoConexion } from './SiigoConexion'

type Borrador = Record<keyof Precios, string>
const aBorrador = (p: Precios): Borrador => ({ lb: miles(p.lb), p340: miles(p.p340), p500: miles(p.p500), p2500: miles(p.p2500) })
const num = (v: string) => Number(v.replace(/\D/g, '')) || 0

export function ConfigForm() {
  const { config, error, guardar } = useConfig()
  const [borrador, setBorrador] = useState<Borrador | null>(null)
  const [usuario, setUsuario] = useState('')
  const [msg, setMsg] = useState<{ kind: AlertKind; text: string } | null>(null)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (config && !borrador) {
      setBorrador(aBorrador(config.precios))
      setUsuario(config.siigoUsuario)
    }
  }, [config, borrador])

  if (error && !config) return <main className="p-6"><Alert kind="error">{error}</Alert></main>
  if (!config || !borrador) return <Loading />

  const set = (k: keyof Precios) => (v: string) => {
    setBorrador({ ...borrador, [k]: v })
    setMsg(null)
  }

  async function onGuardar() {
    if (!config || !borrador) return
    const precios: Precios = { lb: num(borrador.lb), p340: num(borrador.p340), p500: num(borrador.p500), p2500: num(borrador.p2500) }
    if (!precios.lb) return setMsg({ kind: 'error', text: 'El precio por libra debe ser mayor que 0.' })
    setGuardando(true)
    try {
      await guardar({ ...config, precios, siigoUsuario: usuario })
      setMsg({ kind: 'ok', text: 'Configuración guardada. Los nuevos precios aplican a los lotes nuevos.' })
    } catch (e) {
      setMsg({ kind: 'error', text: mensajeError(e) })
    } finally {
      setGuardando(false)
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-[720px] flex-1 flex-col gap-6 px-4 pb-12 pt-6">
      <PageHeading title="Configuración" />
      <Card title="Precios" className="gap-[18px]">
        <div className="max-w-[260px]">
          <PrecioInput id="plb" label="Precio por libra de tostión" value={borrador.lb} onChange={set('lb')} />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <PrecioInput id="p340" label="Bolsa 340 g" value={borrador.p340} onChange={set('p340')} />
          <PrecioInput id="p500" label="Bolsa 500 g" value={borrador.p500} onChange={set('p500')} />
          <PrecioInput id="p2500" label="Bolsa 2.500 g" value={borrador.p2500} onChange={set('p2500')} />
        </div>
      </Card>
      <SiigoConexion usuario={usuario} onUsuario={(v) => { setUsuario(v); setMsg(null) }} />
      <div className="flex flex-col gap-2.5">
        <Button size="xxl" onClick={onGuardar} disabled={guardando} className="font-bold">
          {guardando ? 'Guardando…' : 'Guardar cambios'}
        </Button>
        {msg && <Alert kind={msg.kind} className="justify-center text-center">{msg.text}</Alert>}
      </div>
    </main>
  )
}
