import { useId } from 'react'
import type { Etapa } from '../../types'

/** Cómo se llama la descripción de cada etapa. */
export const TITULO_DESCRIPCION: Record<Etapa, string> = {
  Recibido: 'Descripción del recibo',
  Trillado: 'Descripción de la trilla',
  Tostado: 'Descripción de la tostión',
  Empacado: 'Descripción del empaque',
  Entregado: 'Descripción de la entrega',
}

const EJEMPLO: Record<Etapa, string> = {
  Recibido: 'Ej: llegó en costal de fique, grano con buen olor',
  Trillado: 'Ej: salió parejo, poca broca, se separó la pasilla',
  Tostado: 'Ej: tueste medio, primer crack a los 8:30',
  Empacado: 'Ej: válvula en todas las bolsas, se rotularon a mano',
  Entregado: 'Ej: lo recogió el hijo del cliente',
}

export const DESCRIPCION_MAX = 1000

interface Props {
  /** Si no viene, se genera uno. */
  id?: string
  etapa: Etapa
  value: string
  onChange: (v: string) => void
  onBlur?: () => void
  /** "(opcional)" al lado del título. */
  opcional?: boolean
}

/** Texto libre para describir cómo salió una etapa del lote. */
export function DescripcionCampo({ id: idDado, etapa, value, onChange, onBlur, opcional }: Props) {
  const idPropio = useId()
  const id = idDado ?? idPropio
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[15px] font-semibold">
        {TITULO_DESCRIPCION[etapa]}{opcional && <span className="font-normal text-pizarra-suave"> (opcional)</span>}
      </label>
      <textarea id={id} value={value} maxLength={DESCRIPCION_MAX} rows={3} onChange={(e) => onChange(e.target.value)} onBlur={onBlur}
        placeholder={EJEMPLO[etapa]}
        className="rounded-[10px] border border-verde-salvia bg-white px-4 py-3 text-base focus:border-esmeralda" />
    </div>
  )
}
