import { TextInput } from './TextInput'

interface Props {
  id: string
  value: string
  onChange: (valor: string) => void
  onBlur?: () => void
  error?: string | false
}

/** Celular colombiano con prefijo +57 fijo. Solo deja números y espacios. */
export function CelularInput({ id, value, onChange, onBlur, error }: Props) {
  return (
    <div className="flex gap-2">
      <span className="flex h-14 items-center rounded-[10px] border border-dorado bg-crema-claro px-3.5 text-lg text-cafe-medio">
        +57
      </span>
      <TextInput
        id={id}
        type="tel"
        inputMode="numeric"
        autoComplete="off"
        placeholder="300 000 0000"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^\d ]/g, '').slice(0, 12))}
        onBlur={onBlur}
        error={error}
        className="flex-1 tabular-nums"
      />
    </div>
  )
}
