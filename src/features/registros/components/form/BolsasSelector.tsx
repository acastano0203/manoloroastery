import { Icon } from '../../../../components/ui/Icon'
import { money } from '../../../../lib/format'
import type { RegistroFormApi } from '../../hooks/useRegistroForm'
import { BOLSAS } from '../../utils'

/** Contadores +/− de bolsas por tamaño. */
export function BolsasSelector({ f }: { f: RegistroFormApi }) {
  const { form, set, precios } = f
  return (
    <section className="flex flex-col gap-3">
      <h2 className="m-0 text-lg font-bold">Productos / empaque</h2>
      <div className="flex flex-col rounded-xl border border-arena bg-white">
        {BOLSAS.map((b) => (
          <div key={b.n} className="flex items-center gap-3 border-b border-crema-claro px-4 py-3.5 last:border-b-0">
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="text-[17px] font-semibold">Bolsa {b.label}</span>
              <span className="text-sm text-cafe-suave">{precios ? money(precios[b.p]) : '—'} c/u</span>
            </div>
            <div className="flex items-center gap-1">
              <button type="button" aria-label={`Quitar bolsa de ${b.label}`}
                onClick={() => set({ [b.n]: Math.max(0, form[b.n] - 1) })}
                className="flex h-14 w-14 items-center justify-center rounded-xl border border-dorado bg-white">
                <Icon name="menos" size={24} />
              </button>
              <div aria-live="polite" className="w-12 text-center text-2xl font-bold tabular-nums">{form[b.n]}</div>
              <button type="button" aria-label={`Agregar bolsa de ${b.label}`}
                onClick={() => set({ [b.n]: form[b.n] + 1 })}
                className="flex h-14 w-14 items-center justify-center rounded-xl bg-vino text-white hover:bg-vino-oscuro">
                <Icon name="mas" size={24} />
              </button>
            </div>
          </div>
        ))}
      </div>
      <p className="m-0 text-sm text-cafe-suave">Los precios se cambian en Configuración.</p>
    </section>
  )
}
