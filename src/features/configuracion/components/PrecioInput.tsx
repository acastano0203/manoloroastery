import { miles } from '../../../lib/format'

interface Props {
  id: string
  label: string
  value: string
  onChange: (valor: string) => void
}

/** Campo de pesos con "$" adelante y puntos de miles automáticos. */
export function PrecioInput({ id, label, value, onChange }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-[15px] font-semibold">{label}</label>
      <div className="relative">
        <span className="pointer-events-none absolute left-4 top-[15px] text-lg text-pizarra-suave">$</span>
        <input
          id={id}
          inputMode="numeric"
          value={value}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, '')
            onChange(v ? miles(v) : '')
          }}
          className="h-14 w-full rounded-[10px] border border-verde-salvia bg-white pl-[34px] focus:border-esmeralda pr-4 text-lg tabular-nums"
        />
      </div>
    </div>
  )
}
