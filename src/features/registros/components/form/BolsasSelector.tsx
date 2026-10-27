import { useState } from 'react'
import { Button } from '../../../../components/ui/Button'
import { FieldError } from '../../../../components/ui/FieldError'
import { Icon } from '../../../../components/ui/Icon'
import { cx } from '../../../../lib/cx'
import { dec, kgDeG, money, parseKgAG } from '../../../../lib/format'
import { useConfigOpcional } from '../../../configuracion/hooks/useConfig'
import { nivel, quedanTxt } from '../../../configuracion/inventario'
import type { Precios } from '../../../configuracion/types'
import type { FormRegistro } from '../../formulario'
import type { RegistroFormApi } from '../../hooks/useRegistroForm'
import type { CantidadBolsas } from '../../types'
import { BOLSAS, calcularPerdidaTueste, describirBolsas } from '../../utils'

/** Lo que se anota al empacar, tal cual se escribe (el peso como texto). */
export type EmpaqueBorrador = Pick<FormRegistro, 'n340' | 'n500' | 'n2500' | 'nDrip' | 'bolsasCliente' | 'gramosTostado' | 'gramosSobrante'>

interface ContadoresProps {
  valores: CantidadBolsas
  cambiar: (patch: Partial<CantidadBolsas>) => void
  precios: Precios | null
  /** Sin bolsa: solo se muestran los drips. */
  sinBolsa?: boolean
}

/** Contadores +/− de bolsas por tamaño y de drips. */
export function BolsasContadores({ valores, cambiar, precios, sinBolsa }: ContadoresProps) {
  const inventario = useConfigOpcional()?.config?.inventario
  return (
    <div className="flex flex-col rounded-xl border border-linea bg-white">
      {BOLSAS.filter((b) => !sinBolsa || !b.bolsa).map((b) => (
        <div key={b.n} className="flex items-center gap-3 border-b border-rocio-claro px-4 py-3.5 last:border-b-0">
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="text-[17px] font-semibold">{b.nombre}</span>
            <span className="text-sm text-pizarra-suave">{precios ? money(precios[b.p]) : '—'} c/u</span>
            <EnBodega quedan={inventario?.[b.n] ?? null} />
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

/** Cuántas quedan en bodega; en ámbar si se están acabando y en rojo si se acabaron. */
function EnBodega({ quedan }: { quedan: number | null }) {
  const n = nivel(quedan)
  if (n === 'sin') return null
  return (
    <span className={cx('text-[13px] font-semibold', n === 'ok' ? 'text-pizarra-suave' : n === 'bajo' ? 'text-amber-800' : 'text-peligro')}>
      {quedanTxt(quedan!)} en bodega{n === 'bajo' && ' · por agotarse'}
    </span>
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
  idSobrante?: string
  errorSobrante?: string | false
  onBlurSobrante?: () => void
  autoFocus?: boolean
}

/** Peso del café tostado (con la pérdida en el tueste) y la tarjeta de bolsas y drips. */
export function EmpaqueCampos({
  idTostado, valores, cambiar, precios, gramosAlmendra, errorTostado, onBlurTostado, idSobrante = `${idTostado}-sobrante`, errorSobrante, onBlurSobrante, autoFocus,
}: EmpaqueProps) {
  const t = parseKgAG(valores.gramosTostado)
  const perdida = calcularPerdidaTueste({ gramos: gramosAlmendra, gramosTostado: t !== null && !isNaN(t) ? t : null })

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2.5 rounded-[14px] border-2 border-verde-salvia bg-panel p-4 sm:p-5">
        <label htmlFor={idTostado} className="text-lg font-bold text-esmeralda-oscuro">Peso del café tostado</label>
        <div className="relative">
          <input id={idTostado} inputMode="decimal" placeholder="0" value={valores.gramosTostado} autoFocus={autoFocus}
            aria-invalid={errorTostado ? true : undefined} aria-describedby={errorTostado ? `${idTostado}-error` : undefined}
            onChange={(e) => cambiar({ gramosTostado: e.target.value })} onBlur={onBlurTostado}
            className={cx('h-[72px] w-full rounded-xl border-2 bg-white pl-5 pr-16 text-[32px] font-bold tabular-nums',
              errorTostado ? 'border-peligro' : 'border-verde-salvia focus:border-esmeralda')} />
          <span className="pointer-events-none absolute right-5 top-5 text-[22px] font-semibold text-pizarra-suave">kg</span>
        </div>
        {errorTostado && <FieldError id={`${idTostado}-error`}>{errorTostado}</FieldError>}
        {perdida !== null && gramosAlmendra !== null && t !== null && (
          <div className="flex flex-col gap-0.5 border-t border-linea pt-2.5">
            <span className="flex items-baseline justify-between gap-3">
              <span className="font-semibold">Pérdida en el tueste</span>
              <span className="font-display text-xl font-bold tabular-nums">{dec(perdida, 1)} %</span>
            </span>
            <span className="text-[13px] text-pizarra-suave tabular-nums">
              {kgDeG(gramosAlmendra)} kg en almendra → {kgDeG(t)} kg tostado
            </span>
          </div>
        )}
        <div className="flex flex-col gap-1.5 border-t border-linea pt-2.5">
          <label htmlFor={idSobrante} className="font-semibold">Sobrante sin empacar <span className="font-normal text-pizarra-suave">(opcional)</span></label>
          <div className="relative max-w-[220px]">
            <input id={idSobrante} inputMode="numeric" placeholder="0" value={valores.gramosSobrante}
              aria-invalid={errorSobrante ? true : undefined} aria-describedby={`${idSobrante}-ayuda${errorSobrante ? ` ${idSobrante}-error` : ''}`}
              onChange={(e) => cambiar({ gramosSobrante: e.target.value })} onBlur={onBlurSobrante}
              className={cx('h-14 w-full rounded-xl border-2 bg-white pl-4 pr-10 text-2xl font-bold tabular-nums',
                errorSobrante ? 'border-peligro' : 'border-verde-salvia focus:border-esmeralda')} />
            <span className="pointer-events-none absolute right-4 top-3.5 text-lg font-semibold text-pizarra-suave">g</span>
          </div>
          <span id={`${idSobrante}-ayuda`} className="text-[13px] text-pizarra-suave">
            Lo que no cupo en las bolsas. Se entrega suelto y ya va cobrado: hace parte del peso tostado.
          </span>
          {errorSobrante && <FieldError id={`${idSobrante}-error`}>{errorSobrante}</FieldError>}
        </div>
      </div>

      <BolsasTarjeta valores={valores} cambiar={cambiar} precios={precios} />
    </div>
  )
}

type BolsasBorrador = Pick<EmpaqueBorrador, 'n340' | 'n500' | 'n2500' | 'nDrip' | 'bolsasCliente'>

interface BolsasProps {
  valores: BolsasBorrador
  cambiar: (patch: Partial<BolsasBorrador>) => void
  precios: Precios | null
}

/** "Sin bolsa" y los contadores de bolsas y drips. */
export function BolsasCampos({ valores, cambiar, precios }: BolsasProps) {
  return (
    <div className="flex flex-col gap-3">
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
  )
}

/** Al empacar: las bolsas y drips que se pidieron al recibir, en una tarjeta. «Cambiar» abre los contadores. */
function BolsasTarjeta({ valores, cambiar, precios }: BolsasProps) {
  const [editando, setEditando] = useState(false)
  return (
    <section aria-label="Bolsas y drips" className="flex flex-col gap-3 rounded-[14px] border border-linea bg-rocio-claro p-4">
      <div className="flex items-start gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h3 className="m-0 text-lg font-bold">Bolsas y drips</h3>
          <p className="m-0 text-[15px] text-pizarra">{describirBolsas(valores)}</p>
          {!editando && <p className="m-0 text-[13px] text-pizarra-suave">Se anotaron al recibir el café.</p>}
        </div>
        <Button variant="outline" onClick={() => setEditando((v) => !v)} aria-expanded={editando}>
          {editando ? 'Listo' : 'Cambiar'}
        </Button>
      </div>
      {editando && <BolsasCampos valores={valores} cambiar={cambiar} precios={precios} />}
    </section>
  )
}

/** Bolsas y drips al recibir el café: se pueden cambiar después, al empacar. */
export function BolsasRecepcion({ f }: { f: RegistroFormApi }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="m-0 text-lg font-bold">Bolsas y drips</h2>
      <p className="m-0 -mt-1 text-[15px] text-pizarra-suave">Cómo quiere el cliente su café. Al empacar se puede cambiar.</p>
      <BolsasCampos valores={f.form} cambiar={f.set} precios={f.precios} />
    </section>
  )
}

/** Empaque en el formulario de edición (solo para lotes ya empacados). */
export function BolsasSelector({ f }: { f: RegistroFormApi }) {
  const { form, set, tocar, errores, precios } = f
  const g = parseKgAG(form.gramos)
  return (
    <section className="flex flex-col gap-3">
      <h2 className="m-0 text-lg font-bold">Empaque</h2>
      <EmpaqueCampos idTostado="gramosTostado" idSobrante="gramosSobrante" valores={form}
        cambiar={(p) => { set(p); if ('gramosTostado' in p) tocar('gramosTostado'); if ('gramosSobrante' in p) tocar('gramosSobrante') }}
        precios={precios} gramosAlmendra={g && g > 0 ? g : null} errorTostado={errores.gramosTostado} onBlurTostado={() => tocar('gramosTostado')}
        errorSobrante={errores.gramosSobrante} onBlurSobrante={() => tocar('gramosSobrante')} />
      <p className="m-0 text-sm text-pizarra-suave">Los precios se cambian en Configuración.</p>
    </section>
  )
}
