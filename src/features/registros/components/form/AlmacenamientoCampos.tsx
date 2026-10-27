import { useEffect, useId, useState } from 'react'
import { FieldError } from '../../../../components/ui/FieldError'
import { Icon } from '../../../../components/ui/Icon'
import { OptionGroup } from '../../../../components/ui/OptionGroup'
import { cx } from '../../../../lib/cx'
import { miles, parseG, parseKg } from '../../../../lib/format'
import { ALMACEN_DIAS_MAX, type Unidad } from '../../types'
import { aGramos, desdeGramos } from '../../utils'

/** Lo que se anota al entregar, tal cual se escribe. */
export interface AlmacenBorrador {
  /** null: todavía no se respondió si requiere almacenamiento. */
  requiere: boolean | null
  dias: number
  /** Cantidad como se escribe, en kilos. */
  cantidad: string
  /** Siempre kilos; los almacenamientos viejos pueden estar en gramos o libras. */
  unidad: Unidad
  marcado: string
  foto: File | null
}

export type ErroresAlmacen = Partial<Record<'requiere' | 'cantidad' | 'marcado' | 'foto', string>>

/** Lee la cantidad escrita: en gramos sin decimales ("3.000"), en kilos o libras con coma ("2,5"). */
export const leerCantidad = (texto: string, u: Unidad) => (u === 'g' ? parseG(texto) : parseKg(texto))

/** Texto para el campo: "3.000" en gramos, "2,5" en kilos o libras. */
export const textoCantidad = (gramos: number, u: Unidad) =>
  u === 'g' ? miles(gramos) : String(desdeGramos(gramos, u)).replace('.', ',')

/** Errores del almacenamiento. gramosTostado: no se puede guardar más café del que quedó tostado. */
export function validarAlmacen(b: AlmacenBorrador, gramosTostado: number | null): ErroresAlmacen {
  const e: ErroresAlmacen = {}
  if (b.requiere === null) e.requiere = 'Indica si el café queda almacenado.'
  if (!b.requiere) return e
  const v = leerCantidad(b.cantidad, b.unidad)
  if (v === null) e.cantidad = 'Escribe cuánto café se almacena.'
  else if (isNaN(v) || v <= 0) e.cantidad = 'Solo números mayores que 0.'
  else if (gramosTostado && aGramos(v, b.unidad) > gramosTostado) {
    e.cantidad = `No puede ser más de lo tostado (${textoCantidad(gramosTostado, b.unidad)} ${b.unidad}).`
  }
  if (!b.marcado.trim()) e.marcado = 'Describe cómo va marcado el café.'
  if (!b.foto) e.foto = 'Toma o elige una foto como evidencia.'
  return e
}

interface Props {
  valores: AlmacenBorrador
  cambiar: (patch: Partial<AlmacenBorrador>) => void
  /** Se muestran después de intentar confirmar. */
  errores: ErroresAlmacen
}

/** ¿Requiere almacenamiento? Si sí: días (1 a 10), cantidad, cómo va marcado y foto de evidencia. */
export function AlmacenamientoCampos({ valores, cambiar, errores }: Props) {
  const id = useId()

  const [vista, setVista] = useState<string | null>(null)
  useEffect(() => {
    if (!valores.foto) return setVista(null)
    const url = URL.createObjectURL(valores.foto)
    setVista(url)
    return () => URL.revokeObjectURL(url)
  }, [valores.foto])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <OptionGroup label="¿Requiere almacenamiento?" options={['No', 'Sí'] as const} big
          value={valores.requiere === null ? null : valores.requiere ? 'Sí' : 'No'}
          onChange={(v) => cambiar({ requiere: v === 'Sí' })} labelClassName="text-lg font-bold" />
        {errores.requiere && <FieldError>{errores.requiere}</FieldError>}
      </div>

      {valores.requiere && (
        <div className="flex flex-col gap-4 rounded-[14px] border-2 border-verde-salvia bg-panel p-4">
          <div className="flex flex-col gap-1.5">
            <span id={`${id}-dias`} className="text-[15px] font-semibold">Días de almacenamiento</span>
            <div className="flex items-center gap-2" role="group" aria-labelledby={`${id}-dias`}>
              <button type="button" aria-label="Un día menos" disabled={valores.dias <= 1} onClick={() => cambiar({ dias: valores.dias - 1 })}
                className="flex h-14 w-14 items-center justify-center rounded-xl border border-verde-salvia bg-white"><Icon name="menos" size={24} /></button>
              <span aria-live="polite" className="w-24 text-center font-display text-2xl font-bold tabular-nums">
                {valores.dias} {valores.dias === 1 ? 'día' : 'días'}
              </span>
              <button type="button" aria-label="Un día más" disabled={valores.dias >= ALMACEN_DIAS_MAX} onClick={() => cambiar({ dias: valores.dias + 1 })}
                className="flex h-14 w-14 items-center justify-center rounded-xl bg-esmeralda text-white hover:bg-esmeralda-oscuro"><Icon name="mas" size={24} /></button>
            </div>
            <span className="text-sm text-pizarra-suave">Mínimo 1, máximo {ALMACEN_DIAS_MAX} días.</span>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${id}-cantidad`} className="text-[15px] font-semibold">Cantidad a almacenar</label>
            <div className="relative w-40">
                <input id={`${id}-cantidad`} inputMode="decimal" placeholder="0" value={valores.cantidad}
                  aria-invalid={errores.cantidad ? true : undefined} onChange={(e) => cambiar({ cantidad: e.target.value })}
                  className={cx('h-14 w-full rounded-[10px] border bg-white pl-4 pr-10 text-lg font-bold tabular-nums',
                    errores.cantidad ? 'border-2 border-peligro' : 'border-verde-salvia focus:border-esmeralda')} />
                <span className="pointer-events-none absolute right-4 top-4 text-pizarra-suave">kg</span>
            </div>
            {errores.cantidad && <FieldError>{errores.cantidad}</FieldError>}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${id}-marcado`} className="text-[15px] font-semibold">Cómo va marcado</label>
            <textarea id={`${id}-marcado`} rows={2} maxLength={300} value={valores.marcado}
              aria-invalid={errores.marcado ? true : undefined} onChange={(e) => cambiar({ marcado: e.target.value })}
              placeholder="Ej: 3 bolsas kraft con etiqueta verde, nombre del cliente y fecha"
              className={cx('rounded-[10px] border bg-white px-4 py-3 text-base',
                errores.marcado ? 'border-2 border-peligro' : 'border-verde-salvia focus:border-esmeralda')} />
            {errores.marcado && <FieldError>{errores.marcado}</FieldError>}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${id}-foto`} className="text-[15px] font-semibold">Foto de evidencia</label>
            <input id={`${id}-foto`} type="file" accept="image/*" capture="environment"
              onChange={(e) => cambiar({ foto: e.target.files?.[0] ?? null })}
              className="block w-full rounded-[10px] border border-verde-salvia bg-white p-2 text-[15px] file:mr-3 file:h-11 file:cursor-pointer file:rounded-lg file:border-0 file:bg-esmeralda file:px-4 file:font-semibold file:text-white" />
            {vista && <img src={vista} alt="Foto del café almacenado" className="mt-1 max-h-48 w-auto self-start rounded-lg border border-linea object-contain" />}
            {errores.foto && <FieldError>{errores.foto}</FieldError>}
          </div>
        </div>
      )}
    </div>
  )
}
