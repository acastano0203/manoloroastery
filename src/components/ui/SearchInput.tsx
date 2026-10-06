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
      <span className="absolute left-4 top-4 flex text-cafe-suave">
        <Icon name="buscar" />
      </span>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className="h-[54px] w-full rounded-[10px] border border-dorado bg-white pl-[50px] pr-4 text-[17px]"
      />
    </label>
  )
}
