import { useState } from 'react'
import { Button } from '../../../../components/ui/Button'
import { FieldError } from '../../../../components/ui/FieldError'
import { Icon } from '../../../../components/ui/Icon'
import { cx } from '../../../../lib/cx'
import { dec, kgDeG, money, parseKgAG } from '../../../../lib/format'
import { useBolsasSiigo } from '../../../configuracion/hooks/useBolsasSiigo'
import { nivel, quedanTxt } from '../../../configuracion/inventario'
import type { Precios } from '../../../configuracion/types'
import type { FormRegistro } from '../../formulario'
import type { RegistroFormApi } from '../../hooks/useRegistroForm'
import type { BolsaLote, CantidadBolsas } from '../../types'
import { BOLSAS, calcularPerdidaTueste, describirBolsas } from '../../utils'

/** Lo que se anota al empacar, tal cual se escribe (el peso como texto). */
export type EmpaqueBorrador = Pick<FormRegistro, 'n340' | 'n500' | 'n2500' | 'nDrip' | 'bolsas' | 'bolsasCliente' | 'gramosTostado' | 'gramosSobrante'>

interface ContadoresProps {
  valores: CantidadBolsas & { bolsas?: BolsaLote[] }
  cambiar: (patch: Partial<CantidadBolsas & { bolsas: BolsaLote[] }>) => void
  precios: Precios | null
  /** Sin bolsa: de los tamaños de antes solo se muestran los drips. */
  sinBolsa?: boolean
}

const esBolsaODrip = (nombre: string) => /bolsa|drip/i.test(nombre)

/** Botones − cantidad +. */
function Contador({ nombre, cantidad, quitar, agregar }: { nombre: string; cantidad: number; quitar: () => void; agregar: () => void }) {
  return (
    <div className="flex items-center gap-1">
      <button type="button" aria-label={`Quitar ${nombre.toLowerCase()}`} onClick={quitar}
        className="flex h-14 w-14 items-center justify-center rounded-xl border border-verde-salvia bg-white">
        <Icon name="menos" size={24} />
      </button>
      <div aria-live="polite" className="w-12 text-center font-display text-2xl font-bold tabular-nums">{cantidad}</div>
      <button type="button" aria-label={`Agregar ${nombre.toLowerCase()}`} onClick={agregar}
        className="flex h-14 w-14 items-center justify-center rounded-xl bg-esmeralda text-white hover:bg-esmeralda-oscuro">
        <Icon name="mas" size={24} />
      </button>
    </div>
  )
}

/**
 * Bolsas y drips del lote: se eligen de los productos de Siigo (lista desplegable) con su precio de Siigo,
 * y se ve cuántas hay en el inventario de Siigo. Los tamaños fijos de antes solo aparecen si el lote ya los tenía.
 */
export function BolsasContadores({ valores, cambiar, precios, sinBolsa }: ContadoresProps) {
  const { productos, error, cargando, actualizar } = useBolsasSiigo()
  const elegidas = valores.bolsas ?? []
  const viejas = BOLSAS.filter((b) => valores[b.n] > 0 && (!sinBolsa || !b.bolsa))
  const disponible = (codigo: string) => productos?.find((p) => p.codigo === codigo)?.disponible ?? null
  const libres = (productos ?? []).filter((p) => !elegidas.some((b) => b.codigo === p.codigo))
  const grupos = [
    { titulo: 'Bolsas y drips', lista: libres.filter((p) => esBolsaODrip(p.nombre)) },
    { titulo: 'Otros productos con inventario', lista: libres.filter((p) => !esBolsaODrip(p.nombre)) },
  ].filter((g) => g.lista.length)

  const fijar = (codigo: string, cantidad: number) =>
    cambiar({ bolsas: cantidad > 0 ? elegidas.map((b) => (b.codigo === codigo ? { ...b, cantidad } : b)) : elegidas.filter((b) => b.codigo !== codigo) })

  function agregar(codigo: string) {
    const p = productos?.find((x) => x.codigo === codigo)
    if (p) cambiar({ bolsas: [...elegidas, { codigo: p.codigo, nombre: p.nombre, cantidad: 1, precio: p.precio }] })
  }

  return (
    <div className="flex flex-col rounded-xl border border-linea bg-white">
      {viejas.map((b) => (
        <div key={b.n} className="flex items-center gap-3 border-b border-rocio-claro px-4 py-3.5">
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="text-[17px] font-semibold">{b.nombre}</span>
            <span className="text-sm text-pizarra-suave">{precios ? money(precios[b.p]) : '—'} c/u · de antes de Siigo</span>
          </div>
          <Contador nombre={b.nombre} cantidad={valores[b.n]}
            quitar={() => cambiar({ [b.n]: Math.max(0, valores[b.n] - 1) })} agregar={() => cambiar({ [b.n]: valores[b.n] + 1 })} />
        </div>
      ))}
      {elegidas.map((b) => (
        <div key={b.codigo} className="flex items-center gap-3 border-b border-rocio-claro px-4 py-3.5">
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="break-words text-[17px] font-semibold">{b.nombre}</span>
            <span className="text-sm text-pizarra-suave">{money(b.precio)} c/u · {b.codigo}</span>
            <EnBodega quedan={disponible(b.codigo)} />
          </div>
          <Contador nombre={b.nombre} cantidad={b.cantidad} quitar={() => fijar(b.codigo, b.cantidad - 1)} agregar={() => fijar(b.codigo, b.cantidad + 1)} />
        </div>
      ))}
      <div className="flex flex-col gap-2 px-4 py-3.5">
        <label htmlFor="agregar-bolsa" className="text-[15px] font-semibold">Agregar bolsa o drip de Siigo</label>
        <div className="flex gap-2">
          <select id="agregar-bolsa" value="" disabled={!productos?.length} onChange={(e) => agregar(e.target.value)}
            className="h-14 min-w-0 flex-1 rounded-xl border border-verde-salvia bg-white px-3 text-[16px]">
            <option value="">{cargando && !productos ? 'Cargando de Siigo…' : 'Elige un producto'}</option>
            {grupos.map((g) => (
              <optgroup key={g.titulo} label={g.titulo}>
                {g.lista.map((p) => (
                  <option key={p.codigo} value={p.codigo}>{p.nombre} · {money(p.precio)} · {quedanTxt(p.disponible).toLowerCase()}</option>
                ))}
              </optgroup>
            ))}
          </select>
          <Button variant="outline" size="lg" onClick={actualizar} disabled={cargando} aria-label="Actualizar la lista de Siigo">
            {cargando ? '…' : 'Actualizar'}
          </Button>
        </div>
        {error && <FieldError>No se pudo cargar la lista de Siigo. {error}</FieldError>}
      </div>
    </div>
  )
}

/** Cuántas quedan en Siigo; en ámbar si se están acabando y en rojo si se acabaron. */
function EnBodega({ quedan }: { quedan: number | null }) {
  const n = nivel(quedan)
  if (n === 'sin') return null
  return (
    <span className={cx('text-[13px] font-semibold', n === 'ok' ? 'text-pizarra-suave' : n === 'bajo' ? 'text-amber-800' : 'text-peligro')}>
      {quedanTxt(quedan!)} en Siigo{n === 'bajo' && ' · por agotarse'}
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

type BolsasBorrador = Pick<EmpaqueBorrador, 'n340' | 'n500' | 'n2500' | 'nDrip' | 'bolsas' | 'bolsasCliente'>

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
          onChange={(e) => cambiar(e.target.checked ? { bolsasCliente: true, n340: 0, n500: 0, n2500: 0, bolsas: [] } : { bolsasCliente: false })} />
        <span className="flex flex-col">
          <span className="text-[17px] font-semibold">Sin bolsa</span>
          <span className="text-sm text-pizarra-suave">El cliente trae sus bolsas: no se cobran. Si lleva drips, agrégalos abajo.</span>
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

/**
 * Lote entregado y sin enviar: solo las bolsas y drips, para corregirlas antes de mandar la cotización a Siigo
 * (p. ej. los lotes de antes, con bolsas por tamaño: se bajan a 0 y se eligen de la lista de Siigo).
 */
export function BolsasEntrega({ f }: { f: RegistroFormApi }) {
  const viejas = BOLSAS.some((b) => f.form[b.n] > 0 && (!f.form.bolsasCliente || !b.bolsa))
  return (
    <section className="flex flex-col gap-3">
      <h2 className="m-0 text-lg font-bold">Bolsas y drips</h2>
      {viejas && (
        <p role="alert" className="m-0 rounded-xl bg-amber-100 px-4 py-3 text-[15px] text-amber-900">
          Este lote tiene bolsas de antes de Siigo. Bájalas a 0 con − y elige las mismas de la lista de Siigo para poder enviarlo.
        </p>
      )}
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
      <p className="m-0 text-sm text-pizarra-suave">Los precios de las bolsas son los de Siigo.</p>
    </section>
  )
}
