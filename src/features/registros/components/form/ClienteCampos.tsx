import { Button } from '../../../../components/ui/Button'
import { CelularInput } from '../../../../components/ui/CelularInput'
import { Field } from '../../../../components/ui/Field'
import { FieldError } from '../../../../components/ui/FieldError'
import { TextInput } from '../../../../components/ui/TextInput'
import { cx } from '../../../../lib/cx'
import { cel } from '../../../../lib/format'
import { useClientes } from '../../../clientes/hooks/useClientes'
import type { Cliente } from '../../../clientes/types'
import type { RegistroFormApi } from '../../hooks/useRegistroForm'
import { ClienteBuscador } from './ClienteBuscador'

/** Cliente del registro: buscar/crear, y luego nombre y celular editables. */
export function ClienteCampos({ f }: { f: RegistroFormApi }) {
  const { clientes } = useClientes()
  const { form, set, tocar, errores } = f
  const elegido = Boolean(form.clienteId || form.clienteNuevo)
  const guardado = clientes.find((k) => k.id === form.clienteId)

  const elegir = (k: Cliente) => {
    set({ clienteId: k.id, clienteNuevo: false, cliente: k.nombre, celular: cel(k.celular).replace('+57 ', ''),
      factura: k.factura, tipoDoc: k.tipoDoc, numDoc: k.numDoc, correo: k.correo })
    tocar('cliente')
  }
  const crear = (texto: string) => {
    const d = texto.replace(/\D/g, '')
    set({ clienteId: null, clienteNuevo: true, cliente: d.length >= 7 ? '' : texto, celular: d.length >= 7 ? d : '',
      factura: false, numDoc: '', correo: '' })
  }

  return (
    <>
      <div className="flex flex-col gap-2">
        <label htmlFor={elegido ? 'cliente' : 'buscar-cliente'} className="text-[15px] font-semibold">Cliente</label>
        {!elegido && (
          <ClienteBuscador clientes={clientes} error={errores.cliente} onElegir={elegir} onCrear={crear} onBlur={() => tocar('cliente')} />
        )}
        {elegido && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-verde-salvia bg-white py-3 pl-4 pr-3">
              <div className="flex min-w-0 flex-wrap items-center gap-2.5">
                <span className={cx('whitespace-nowrap rounded-full px-2.5 py-1 text-[13px] font-bold',
                  form.clienteNuevo ? 'bg-amber-100 text-amber-800' : 'bg-verde-menta text-verde-botella')}>
                  {form.clienteNuevo ? 'Cliente nuevo' : 'Cliente guardado'}
                </span>
                <span className="text-[15px] text-pizarra">
                  {form.clienteNuevo ? 'Se guarda al guardar el registro' : guardado ? `${guardado.codigo} · datos cargados` : ''}
                </span>
              </div>
              <Button variant="outline" size="sm" onClick={() => set({ clienteId: null, clienteNuevo: false, cliente: '', celular: '' })}>
                Cambiar
              </Button>
            </div>
            <Field label="Nombre del cliente" htmlFor="cliente" className="mt-2">
              <TextInput id="cliente" autoComplete="off" value={form.cliente} error={errores.cliente}
                onChange={(e) => set({ cliente: e.target.value })} onBlur={() => tocar('cliente')} />
            </Field>
          </>
        )}
        {errores.cliente && <FieldError id="cliente-error">{errores.cliente}</FieldError>}
      </div>

      {elegido && (
        <Field label="Celular del cliente" htmlFor="celular" error={errores.celular} className="max-w-[360px]"
          hint="A este número se envía la remisión por WhatsApp. Si lo cambias, se actualiza en el cliente.">
          <CelularInput id="celular" value={form.celular} error={errores.celular}
            onChange={(v) => set({ celular: v })} onBlur={() => tocar('celular')} />
        </Field>
      )}
    </>
  )
}
