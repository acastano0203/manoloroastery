import { useState } from 'react'
import { Alert } from '../../../components/ui/Alert'
import { Button } from '../../../components/ui/Button'
import { CelularInput } from '../../../components/ui/CelularInput'
import { Field } from '../../../components/ui/Field'
import { OptionGroup } from '../../../components/ui/OptionGroup'
import { TextInput } from '../../../components/ui/TextInput'
import { mensajeError } from '../../../lib/errores'
import { TIPOS_DOC, type Cliente, type ClienteDatos } from '../types'
import { validarCliente } from '../validacion'

interface Props {
  titulo: string
  inicial: ClienteDatos
  clientes: Cliente[]
  idEditando: string | null
  onGuardar: (datos: ClienteDatos) => Promise<void>
  onCancelar: () => void
}

export function ClienteForm({ titulo, inicial, clientes, idEditando, onGuardar, onCancelar }: Props) {
  const [d, setD] = useState<ClienteDatos>(inicial)
  const [intentado, setIntentado] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const errores = intentado ? validarCliente(d, clientes, idEditando) : {}
  const set = (p: Partial<ClienteDatos>) => setD((x) => ({ ...x, ...p }))

  async function guardar() {
    if (Object.keys(validarCliente(d, clientes, idEditando)).length) {
      setIntentado(true)
      return
    }
    setGuardando(true)
    setError(null)
    try {
      await onGuardar(d)
    } catch (e) {
      setError(mensajeError(e))
      setGuardando(false)
    }
  }

  return (
    <section aria-label={titulo} className="flex flex-col gap-4 rounded-[14px] border-2 border-esmeralda bg-white p-4 sm:p-5">
      <h2 className="m-0 text-lg font-bold">{titulo}</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Nombre" htmlFor="cl-nombre" error={errores.nombre}>
          <TextInput id="cl-nombre" autoComplete="off" value={d.nombre} error={errores.nombre} onChange={(e) => set({ nombre: e.target.value })} />
        </Field>
        <Field label="Celular" htmlFor="cl-cel" error={errores.celular}>
          <CelularInput id="cl-cel" value={d.celular} error={errores.celular} onChange={(v) => set({ celular: v })} />
        </Field>
      </div>
      <OptionGroup label="¿Factura electrónica por defecto?" options={['Sí', 'No'] as const} value={d.factura ? 'Sí' : 'No'}
        onChange={(v) => set({ factura: v === 'Sí' })} gridClassName="grid-cols-2 max-w-80" />
      {d.factura && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <OptionGroup label="Tipo de documento" options={TIPOS_DOC} value={d.tipoDoc} onChange={(v) => set({ tipoDoc: v })} />
          <Field label="Número" htmlFor="cl-doc">
            <TextInput id="cl-doc" inputMode="numeric" value={d.numDoc} onChange={(e) => set({ numDoc: e.target.value })} />
          </Field>
          <Field label="Correo" htmlFor="cl-correo">
            <TextInput id="cl-correo" type="email" value={d.correo} onChange={(e) => set({ correo: e.target.value })} />
          </Field>
        </div>
      )}
      {error && <Alert kind="error">{error}</Alert>}
      <div className="flex flex-wrap gap-2">
        <Button size="lg" onClick={guardar} disabled={guardando} className="flex-1 px-6 font-bold">
          {guardando ? 'Guardando…' : 'Guardar cliente'}
        </Button>
        <Button variant="outline" size="lg" onClick={onCancelar} className="px-6">Cancelar</Button>
      </div>
    </section>
  )
}
