import { Field } from '../../../../components/ui/Field'
import { OptionGroup } from '../../../../components/ui/OptionGroup'
import { TextInput } from '../../../../components/ui/TextInput'
import { TIPOS_DOC } from '../../../clientes/types'
import type { RegistroFormApi } from '../../hooks/useRegistroForm'

export function FacturaCampos({ f }: { f: RegistroFormApi }) {
  const { form, set, tocar, errores } = f
  return (
    <div className="flex flex-col gap-3">
      <OptionGroup label="¿Requiere factura electrónica?" options={['Sí', 'No'] as const}
        value={form.factura ? 'Sí' : 'No'} onChange={(v) => set({ factura: v === 'Sí' })} gridClassName="grid-cols-2 max-w-80" />
      {form.factura && (
        <div className="flex flex-col gap-4 rounded-xl border border-linea bg-white p-4 sm:p-5">
          <OptionGroup label="Tipo de documento" options={TIPOS_DOC} value={form.tipoDoc}
            onChange={(v) => set({ tipoDoc: v })} gridClassName="grid-cols-2 max-w-80" />
          <Field label="Número de documento" htmlFor="numdoc" error={errores.numDoc}>
            <TextInput id="numdoc" inputMode="numeric" value={form.numDoc} error={errores.numDoc}
              placeholder={form.tipoDoc === 'NIT' ? '900123456-7' : '1020304050'}
              onChange={(e) => set({ numDoc: e.target.value })} onBlur={() => tocar('numDoc')} />
          </Field>
          <Field label="Correo para la factura" htmlFor="correo" error={errores.correo}>
            <TextInput id="correo" type="email" inputMode="email" value={form.correo} error={errores.correo}
              placeholder="nombre@correo.com" onChange={(e) => set({ correo: e.target.value })} onBlur={() => tocar('correo')} />
          </Field>
        </div>
      )}
    </div>
  )
}
