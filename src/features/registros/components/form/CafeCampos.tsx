import { Field } from '../../../../components/ui/Field'
import { FieldError } from '../../../../components/ui/FieldError'
import { OptionGroup } from '../../../../components/ui/OptionGroup'
import { TextInput } from '../../../../components/ui/TextInput'
import type { RegistroFormApi } from '../../hooks/useRegistroForm'
import { PAGOS, PROCESOS } from '../../types'
import { parseG, parseKg } from '../../../../lib/format'
import { DatosAnteriores } from './DatosAnteriores'
import { GramosInput } from './GramosInput'
import { Merma } from './Merma'

/** Forma de pago y, según la etapa del lote, el café recibido (en Recibido) o el peso en almendra (en Tostado). */
export function CafeCampos({ f }: { f: RegistroFormApi }) {
  const { form, set, tocar, errores, cobro, avisoCantidad, pideGramos } = f
  return (
    <>
      <div className="flex flex-col gap-2">
        <OptionGroup label="Forma de pago" options={PAGOS} value={form.pago} big
          onChange={(v) => set({ pago: v })} gridClassName="grid-cols-3" />
        {errores.pago && <FieldError>{errores.pago}</FieldError>}
      </div>

      {f.existente && !f.editaRecepcion && <DatosAnteriores r={f.existente} />}

      {f.editaRecepcion && (
      <fieldset className="m-0 flex flex-col gap-4 border-0 p-0">
        <legend className="mb-4 p-0 text-lg font-bold">Café recibido</legend>
        <OptionGroup label="Proceso" options={PROCESOS} value={form.proceso}
          onChange={(v) => set({ proceso: v })} gridClassName="grid-cols-2 sm:grid-cols-4" />
        <Field label="Kilos recibidos" htmlFor="kilos" error={errores.kilos}>
          <div className="relative max-w-[260px]">
            <TextInput id="kilos" inputMode="decimal" placeholder="0" value={form.kilos} error={errores.kilos} className="pr-12"
              onChange={(e) => { set({ kilos: e.target.value }); tocar('kilos') }} onBlur={() => tocar('kilos')} />
            <span className="pointer-events-none absolute right-4 top-4 text-[17px] text-pizarra-suave">kg</span>
          </div>
        </Field>
        <Field label="Humedad (opcional)" htmlFor="humedad" error={errores.humedad}>
          <div className="relative max-w-[260px]">
            <TextInput id="humedad" inputMode="decimal" placeholder="Ej: 11,5" value={form.humedad} error={errores.humedad} className="pr-12"
              onChange={(e) => { set({ humedad: e.target.value }); tocar('humedad') }} onBlur={() => tocar('humedad')} />
            <span className="pointer-events-none absolute right-4 top-4 text-[17px] text-pizarra-suave">%</span>
          </div>
        </Field>
        <Field label="Densidad del grano (opcional)" htmlFor="densidad" error={errores.densidad}>
          <div className="relative max-w-[260px]">
            <TextInput id="densidad" inputMode="decimal" placeholder="Ej: 700" value={form.densidad} error={errores.densidad} className="pr-14"
              onChange={(e) => { set({ densidad: e.target.value }); tocar('densidad') }} onBlur={() => tocar('densidad')} />
            <span className="pointer-events-none absolute right-4 top-4 text-[17px] text-pizarra-suave">g/L</span>
          </div>
        </Field>
      </fieldset>
      )}

      {pideGramos && (
        <GramosInput id="gramos" value={form.gramos} error={errores.gramos} aviso={avisoCantidad} librasTxt={cobro?.librasTxt}
          onChange={(v) => { set({ gramos: v }); tocar('gramos') }} onBlur={() => tocar('gramos')}>
          <Merma r={{ kilos: parseKg(form.kilos) ?? 0, gramos: parseG(form.gramos), llegada: f.llegada, proceso: form.proceso }} />
        </GramosInput>
      )}
    </>
  )
}
