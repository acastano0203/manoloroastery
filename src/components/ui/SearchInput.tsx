import { Icon } from './Icon'

interface Props {
  value: string
  onChange: (valor: string) => void
  placeholder: string
  ariaLabel: string
}

export function SearchInput({ value, onChange, placeholder, ariaLabel }: Props) {
  return (
    <label className="relative block">
      <span className="absolute left-4 top-4 flex text-pizarra-suave">
        <Icon name="buscar" />
      </span>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className="h-[54px] w-full rounded-[10px] border border-verde-salvia bg-white pl-[50px] focus:border-esmeralda pr-4 text-[17px]"
      />
    </label>
  )
}
