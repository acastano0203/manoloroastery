import { FieldError } from '../../../../components/ui/FieldError'
import { Icon } from '../../../../components/ui/Icon'
import { cx } from '../../../../lib/cx'
import { dec, miles, money, parseG } from '../../../../lib/format'
import type { Precios } from '../../../configuracion/types'
import type { FormRegistro } from '../../formulario'
import type { RegistroFormApi } from '../../hooks/useRegistroForm'
import type { CantidadBolsas } from '../../types'
import { BOLSAS, calcularPerdidaTueste } from '../../utils'

/** Lo que se anota al empacar, tal cual se escribe (el peso como texto). */
export type EmpaqueBorrador = Pick<FormRegistro, 'n340' | 'n500' | 'n2500' | 'nDrip' | 'bolsasCliente' | 'gramosTostado'>

interface ContadoresProps {
  valores: CantidadBolsas
  cambiar: (patch: Partial<CantidadBolsas>) => void
  precios: Precios | null
  /** Sin bolsa: solo se muestran los drips. */
  sinBolsa?: boolean
}

/** Contadores +/− de bolsas por tamaño y de drips. */
export function BolsasContadores({ valores, cambiar, precios, sinBolsa }: ContadoresProps) {
  return (
    <div className="flex flex-col rounded-xl border border-linea bg-white">
      {BOLSAS.filter((b) => !sinBolsa || !b.bolsa).map((b) => (
        <div key={b.n} className="flex items-center gap-3 border-b border-rocio-claro px-4 py-3.5 last:border-b-0">
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="text-[17px] font-semibold">{b.nombre}</span>
            <span className="text-sm text-pizarra-suave">{precios ? money(precios[b.p]) : '—'} c/u</span>
          </div>
          <div className="flex items-center gap-1">
            <button type="button" aria-label={`Quitar ${b.nombre.toLowerCase()}`}
              onClick={() => cambiar({ [b.n]: Math.max(0, valores[b.n] - 1) })}
              className="flex h-14 w-14 items-center justify-center rounded-xl border border-verde-salvia bg-white">
              <Icon name="menos" size={24} />
            </button>
            <div aria-live="polite" className="w-12 text-center font-display text-2xl font-bold tabular-nums">{valores[b.n]}</div>
            <button type="button" aria-label={`Agregar ${b.nombre.toLowerCase()}`}
              onClick={() => cambiar({ [b.n]: valores[b.n] + 1 })}
              className="flex h-14 w-14 items-center justify-center rounded-xl bg-esmeralda text-white hover:bg-esmeralda-oscuro">
              <Icon name="mas" size={24} />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

interface EmpaqueProps {
  idTostado: string
  valores: EmpaqueBorrador
  cambiar: (patch: Partial<EmpaqueBorrador>) => void
  precios: Precios | null
  /** Café en almendra que entró a tostar, para la pérdida en el tueste. */
  gramosAlmendra: number | null
  errorTostado?: string | false
  onBlurTostado?: () => void
  autoFocus?: boolean
}

/** Peso del café tostado (con la pérdida en el tueste), "Sin bolsa", bolsas y drips. */
export function EmpaqueCampos({ idTostado, valores, cambiar, precios, gramosAlmendra, errorTostado, onBlurTostado, autoFocus }: EmpaqueProps) {
  const t = parseG(valores.gramosTostado)
  const perdida = calcularPerdidaTueste({ gramos: gramosAlmendra, gramosTostado: t !== null && !isNaN(t) ? t : null })

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2.5 rounded-[14px] border-2 border-verde-salvia bg-panel p-4 sm:p-5">
        <label htmlFor={idTostado} className="text-lg font-bold text-esmeralda-oscuro">Peso del café tostado</label>
        <div className="relative">
          <input id={idTostado} inputMode="numeric" placeholder="0" value={valores.gramosTostado} autoFocus={autoFocus}
            aria-invalid={errorTostado ? true : undefined} aria-describedby={errorTostado ? `${idTostado}-error` : undefined}
            onChange={(e) => cambiar({ gramosTostado: e.target.value })} onBlur={onBlurTostado}
            className={cx('h-[72px] w-full rounded-xl border-2 bg-white pl-5 pr-12 text-[32px] font-bold tabular-nums',
              errorTostado ? 'border-peligro' : 'border-verde-salvia focus:border-esmeralda')} />
          <span className="pointer-events-none absolute right-5 top-5 text-[22px] font-semibold text-pizarra-suave">g</span>
        </div>
        {errorTostado && <FieldError id={`${idTostado}-error`}>{errorTostado}</FieldError>}
        {perdida !== null && gramosAlmendra !== null && t !== null && (
          <div className="flex flex-col gap-0.5 border-t border-linea pt-2.5">
            <span className="flex items-baseline justify-between gap-3">
              <span className="font-semibold">Pérdida en el tueste</span>
              <span className="font-display text-xl font-bold tabular-nums">{dec(perdida, 1)} %</span>
            </span>
            <span className="text-[13px] text-pizarra-suave tabular-nums">
              {miles(gramosAlmendra)} g en almendra → {miles(t)} g tostado
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="m-0 text-lg font-bold">Bolsas y drips</h3>
        <label className={cx('flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border-2 px-4 py-3',
          valores.bolsasCliente ? 'border-esmeralda bg-esmeralda/10' : 'border-linea-oscuro bg-white')}>
          <input type="checkbox" checked={valores.bolsasCliente} className="h-6 w-6 shrink-0 accent-esmeralda"
            onChange={(e) => cambiar(e.target.checked ? { bolsasCliente: true, n340: 0, n500: 0, n2500: 0 } : { bolsasCliente: false })} />
          <span className="flex flex-col">
            <span className="text-[17px] font-semibold">Sin bolsa</span>
            <span className="text-sm text-pizarra-suave">El cliente trae sus bolsas: no se cobran.</span>
          </span>
        </label>
        <BolsasContadores valores={valores} cambiar={cambiar} precios={precios} sinBolsa={valores.bolsasCliente} />
      </div>
    </div>
  )
}

/** Empaque en el formulario de edición (solo para lotes ya empacados). */
export function BolsasSelector({ f }: { f: RegistroFormApi }) {
  const { form, set, tocar, errores, precios } = f
  const g = parseG(form.gramos)
  return (
    <section className="flex flex-col gap-3">
      <h2 className="m-0 text-lg font-bold">Empaque</h2>
      <EmpaqueCampos idTostado="gramosTostado" valores={form} cambiar={(p) => { set(p); if ('gramosTostado' in p) tocar('gramosTostado') }}
        precios={precios} gramosAlmendra={g && g > 0 ? g : null} errorTostado={errores.gramosTostado} onBlurTostado={() => tocar('gramosTostado')} />
      <p className="m-0 text-sm text-pizarra-suave">Los precios se cambian en Configuración.</p>
    </section>
  )
}
