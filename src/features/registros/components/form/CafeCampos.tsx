import { Field } from '../../../../components/ui/Field'
import { FieldError } from '../../../../components/ui/FieldError'
import { Icon } from '../../../../components/ui/Icon'
import { OptionGroup } from '../../../../components/ui/OptionGroup'
import { TextInput } from '../../../../components/ui/TextInput'
import { cx } from '../../../../lib/cx'
import type { RegistroFormApi } from '../../hooks/useRegistroForm'
import { PAGOS, PROCESOS } from '../../types'

/** Forma de pago, café recibido (proceso y kilos) y gramos a tostar. */
export function CafeCampos({ f }: { f: RegistroFormApi }) {
  const { form, set, tocar, errores, cobro, avisoCantidad } = f
  return (
    <>
      <div className="flex flex-col gap-2">
        <OptionGroup label="Forma de pago" options={PAGOS} value={form.pago} big
          onChange={(v) => set({ pago: v })} gridClassName="grid-cols-3" />
        {errores.pago && <FieldError>{errores.pago}</FieldError>}
      </div>

      <fieldset className="m-0 flex flex-col gap-4 border-0 p-0">
        <legend className="mb-4 p-0 text-lg font-bold">Café recibido</legend>
        <OptionGroup label="Proceso" options={PROCESOS} value={form.proceso}
          onChange={(v) => set({ proceso: v })} gridClassName="grid-cols-2 sm:grid-cols-4" />
        <Field label="Kilos recibidos" htmlFor="kilos" error={errores.kilos}>
          <div className="relative max-w-[260px]">
            <TextInput id="kilos" inputMode="decimal" placeholder="0" value={form.kilos} error={errores.kilos} className="pr-12"
              onChange={(e) => { set({ kilos: e.target.value }); tocar('kilos') }} onBlur={() => tocar('kilos')} />
            <span className="pointer-events-none absolute right-4 top-4 text-[17px] text-cafe-suave">kg</span>
          </div>
        </Field>
      </fieldset>

      <div className="flex flex-col gap-2.5 rounded-[14px] border-2 border-dorado bg-panel p-4 sm:p-5">
        <label htmlFor="gramos" className="text-lg font-bold text-vino">Café a tostar</label>
        <div className="relative">
          <input id="gramos" inputMode="numeric" placeholder="0" value={form.gramos}
            aria-invalid={errores.gramos ? true : undefined}
            onChange={(e) => { set({ gramos: e.target.value }); tocar('gramos') }} onBlur={() => tocar('gramos')}
            className={cx('h-[72px] w-full rounded-xl bg-white pl-5 pr-12 text-[32px] font-bold tabular-nums border-2',
              errores.gramos ? 'border-peligro' : 'border-dorado')} />
          <span className="pointer-events-none absolute right-5 top-5 text-[22px] font-semibold text-cafe-suave">g</span>
        </div>
        {errores.gramos && <FieldError>{errores.gramos}</FieldError>}
        {avisoCantidad && (
          <p className="m-0 flex items-center gap-1.5 text-[15px] font-medium text-amber-800">
            <Icon name="aviso" size={18} />
            {avisoCantidad}
          </p>
        )}
        <div className="text-[15px] text-cafe-suave">
          Equivale a <strong className="text-cafe">{cobro?.librasTxt ?? '—'}</strong>
        </div>
      </div>
    </>
  )
}
