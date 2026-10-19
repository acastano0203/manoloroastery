import { Icon } from '../../../../components/ui/Icon'
import { cx } from '../../../../lib/cx'
import { dec, kg } from '../../../../lib/format'
import type { Registro } from '../../types'
import { calcularMerma, capaTrilla, mermaAlta, mermaMaxima } from '../../utils'

type Datos = Pick<Registro, 'kilos' | 'gramos' | 'llegada' | 'proceso'>

/** "Merma 20,0 %" con los kilos recibidos y en almendra. Si supera el 20 % (50 % en el natural) avisa en rojo, pero deja seguir. */
export function Merma({ r }: { r: Datos }) {
  const merma = calcularMerma(r)
  if (merma === null || r.gramos === null) return null
  const alta = mermaAlta(merma, r.proceso)

  return (
    <div className="flex flex-col gap-0.5 border-t border-linea pt-2.5">
      <span className="flex items-baseline justify-between gap-3">
        <span className="font-semibold">Merma <span className="font-normal text-pizarra-suave">(sin {capaTrilla(r.proceso)})</span></span>
        <span className={cx('font-display text-xl font-bold tabular-nums', alta && 'text-peligro')}>{dec(merma, 1)} %</span>
      </span>
      <span className="text-[13px] text-pizarra-suave tabular-nums">
        {kg(r.kilos)} kg recibidos → {dec(r.gramos / 1000, 2)} kg en almendra
      </span>
      {alta && (
        <p role="note" className="m-0 mt-1 flex items-start gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-[15px] font-medium text-red-800">
          <span className="mt-0.5 flex shrink-0"><Icon name="aviso" size={18} /></span>
          La merma supera el {mermaMaxima(r.proceso)} %. Coméntaselo al productor; puedes seguir sin problema.
        </p>
      )}
    </div>
  )
}
