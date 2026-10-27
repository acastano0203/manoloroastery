import { useId } from 'react'
import { FieldError } from '../../../../components/ui/FieldError'
import { cx } from '../../../../lib/cx'
import { MOLIENDAS, PRESENTACIONES, type Molienda, type Presentacion } from '../../types'

export interface PresentacionBorrador {
  presentacion: Presentacion | null
  molienda: Molienda | null
}

/** Error de la presentación, o undefined si está bien. Molido pide la molienda. */
export function validarPresentacion(v: PresentacionBorrador): string | undefined {
  if (!v.presentacion) return 'Pregunta si lo quiere en grano o molido.'
  if (v.presentacion === 'Molido' && !v.molienda) return 'Elige la molienda.'
  return undefined
}

interface Props {
  valores: PresentacionBorrador
  cambiar: (v: PresentacionBorrador) => void
  error?: string | false
}

/** ¿En grano o molido? Si es molido, qué tan fino. */
export function PresentacionCampos({ valores, cambiar, error }: Props) {
  const id = useId()
  return (
    <div className="flex flex-col gap-3 rounded-[14px] border-2 border-verde-salvia bg-panel p-4 sm:p-5">
      <span id={`${id}-p`} className="text-lg font-bold text-esmeralda-oscuro">¿El café va en grano o molido?</span>
      <Botones etiqueta={`${id}-p`} opciones={PRESENTACIONES} valor={valores.presentacion} grande
        onElegir={(p) => cambiar({ presentacion: p, molienda: p === 'Molido' ? valores.molienda : null })} />
      {valores.presentacion === 'Molido' && (
        <>
          <span id={`${id}-m`} className="text-[15px] font-semibold">Molienda</span>
          <Botones etiqueta={`${id}-m`} opciones={MOLIENDAS} valor={valores.molienda} onElegir={(m) => cambiar({ ...valores, molienda: m })} />
        </>
      )}
      {error && <FieldError>{error}</FieldError>}
    </div>
  )
}

interface BotonesProps<T extends string> {
  etiqueta: string
  opciones: readonly T[]
  valor: T | null
  onElegir: (v: T) => void
  grande?: boolean
}

function Botones<T extends string>({ etiqueta, opciones, valor, onElegir, grande }: BotonesProps<T>) {
  return (
    <div role="group" aria-labelledby={etiqueta} className="grid gap-2" style={{ gridTemplateColumns: `repeat(${opciones.length}, minmax(0, 1fr))` }}>
      {opciones.map((o) => (
        <button key={o} type="button" aria-pressed={valor === o} onClick={() => onElegir(o)}
          className={cx('rounded-xl border-2 font-bold', grande ? 'h-16 text-lg' : 'h-12 text-[15px]',
            valor === o ? 'border-esmeralda bg-esmeralda text-white' : 'border-linea-oscuro bg-white text-pizarra hover:bg-rocio-claro')}>
          {o === 'Grano' ? 'En grano' : o}
        </button>
      ))}
    </div>
  )
}
