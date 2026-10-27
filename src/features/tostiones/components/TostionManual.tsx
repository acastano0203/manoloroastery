import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react'
import { Button } from '../../../components/ui/Button'
import { FieldError } from '../../../components/ui/FieldError'
import { Icon } from '../../../components/ui/Icon'
import { cx } from '../../../lib/cx'
import { dec, kg, miles, parseG, parseKg } from '../../../lib/format'
import type { Registro } from '../../registros/types'
import type { TostionesApi } from '../hooks/useTostiones'
import { construirReporteTostion } from '../services/reportePdf'
import { actualizarTostion, borrarLectura, guardarLectura } from '../services/tostionesService'
import { AIRES, LLAMAS, MINUTO_MAXIMO, MINUTOS_NORMALES, type Lectura, type Tostion } from '../types'
import { fasesTostion, lecturasCompletas, leerMmss, minutoFinal, mmss, segundosDesde, type Fase } from '../utils'
import { CurvaGrafica } from './CurvaGrafica'

interface Props {
  r: Registro
  t: Tostion
  numero: number
  /** false: solo se ve (el lote ya no está en Tostado). */
  editable: boolean
  api: TostionesApi
}

/** Curva manual de una tostión: arranque, cronómetro, lecturas minuto a minuto, gráfica y reporte en PDF. */
export function TostionManual({ r, t, numero, editable, api }: Props) {
  const completas = useMemo(() => lecturasCompletas(t), [t])

  function descargarPdf() {
    const url = URL.createObjectURL(new Blob([construirReporteTostion({ r, t, numero })], { type: 'application/pdf' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `Tostion-${r.codigo}-bache-${numero}.pdf`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
  }

  return (
    <div className="flex flex-col gap-5">
      {editable && <Arranque t={t} api={api} />}
      {editable && <Cronometro t={t} api={api} />}
      {editable && <Captura t={t} completas={completas} api={api} />}

      <Resumen t={t} />
      {completas.length > 0 && <CurvaGrafica t={t} lecturas={completas} minutos={minutoFinal(t, MINUTOS_NORMALES)} />}
      <TablaLecturas lecturas={completas} editable={editable} api={api} />

      {editable ? <Notas t={t} api={api} /> : t.notas && <p className="m-0 text-[15px] text-pizarra"><strong>Notas:</strong> {t.notas}</p>}

      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="lg" onClick={descargarPdf} className="flex-1">
          <Icon name="descargar" size={20} />
          Descargar reporte PDF
        </Button>
        {editable && <Eliminar t={t} api={api} />}
      </div>
    </div>
  )
}

/** Datos con los que arranca la tostión. Se guardan al salir de cada campo. */
function Arranque({ t, api }: { t: Tostion; api: TostionesApi }) {
  const id = useId()
  const [verde, setVerde] = useState(miles(t.gramosVerde))
  const [carga, setCarga] = useState(t.tempCarga === null ? '' : kg(t.tempCarga))
  const [llama, setLlama] = useState(t.llamaInicial === null ? '' : String(t.llamaInicial))
  const guardar = (c: Parameters<typeof actualizarTostion>[1]) => void api.ejecutar(() => actualizarTostion(t.id, c))

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Campo id={`${id}-verde`} label="Café verde del bache" sufijo="g" value={verde} onChange={setVerde}
        onBlur={() => { const g = parseG(verde); if (g && g > 0 && g !== t.gramosVerde) guardar({ gramosVerde: g }) }} />
      <Campo id={`${id}-carga`} label="Temperatura de carga" sufijo="°C" value={carga} onChange={setCarga} inputMode="decimal"
        onBlur={() => { const c = parseKg(carga); if (c === null || (!isNaN(c) && c >= -50 && c <= 400)) guardar({ tempCarga: c }) }} />
      <Opciones label="Aire inicial" opciones={AIRES} valor={t.aireInicial} sufijo="%" onElegir={(v) => guardar({ aireInicial: v })} />
      <div className="flex flex-col gap-2">
        <Opciones label="Llama inicial" opciones={LLAMAS} valor={t.llamaInicial} sufijo="%"
          onElegir={(v) => { setLlama(String(v)); guardar({ llamaInicial: v }) }} />
        <Campo id={`${id}-llama`} label="Otra llama inicial" sufijo="%" value={llama} onChange={setLlama} oculto
          onBlur={() => { const v = parseG(llama); if (v !== null && !isNaN(v) && v >= 0 && v <= 100 && v !== t.llamaInicial) guardar({ llamaInicial: v }) }} />
      </div>
    </div>
  )
}

/** Cronómetro desde la carga, con los botones de fin de secado, primer crack y finalizar curva. */
function Cronometro({ t, api }: { t: Tostion; api: TostionesApi }) {
  const [ahora, setAhora] = useState(Date.now())
  const corriendo = Boolean(t.iniciadaAt) && t.descargaSeg === null
  useEffect(() => {
    if (!corriendo) return
    const reloj = setInterval(() => setAhora(Date.now()), 1000)
    return () => clearInterval(reloj)
  }, [corriendo])

  const transcurrido = t.iniciadaAt ? Math.min(MINUTO_MAXIMO * 60, t.descargaSeg ?? segundosDesde(t.iniciadaAt, ahora)) : 0
  const pasado = transcurrido > MINUTOS_NORMALES * 60
  // Segundo cronómetro: arranca al pulsar el 1er crack (tiempo de desarrollo).
  const desdeCrack = t.crackSeg === null ? null : Math.max(0, transcurrido - t.crackSeg)
  const marcar = (c: { secadoSeg?: number | null; crackSeg?: number | null; descargaSeg?: number | null }) =>
    void api.ejecutar(() => actualizarTostion(t.id, { secadoSeg: t.secadoSeg, crackSeg: t.crackSeg, descargaSeg: t.descargaSeg, ...c }))

  return (
    <div className="flex flex-col gap-3 rounded-[14px] bg-verde-botella p-4 text-white sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-verde-menta">{!t.iniciadaAt ? 'Cronómetro' : corriendo ? 'Tostando' : 'Tostión terminada'}</span>
          <span className="font-display text-5xl font-bold tabular-nums" aria-live="off">{mmss(transcurrido)}</span>
          {pasado && <span className="text-sm text-verde-menta">Pasó de {MINUTOS_NORMALES} minutos</span>}
        </div>
        {desdeCrack !== null && (
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-verde-menta">Desde el 1er crack</span>
            <span className="font-display text-5xl font-bold tabular-nums" aria-live="off">{mmss(desdeCrack)}</span>
            {transcurrido > 0 && <span className="text-sm text-verde-menta">DTR {dec((desdeCrack / transcurrido) * 100, 1)} %</span>}
          </div>
        )}
        {!t.iniciadaAt ? (
          <Button variant="claro" size="xl" onClick={() => void api.ejecutar(() => actualizarTostion(t.id, { iniciadaAt: new Date().toISOString() }))}>
            <Icon name="adelante" size={22} />
            Cargar café e iniciar
          </Button>
        ) : corriendo && (
          <div className="grid w-full grid-cols-3 gap-2 sm:w-auto">
            <Button variant="claro" size="xl" disabled={t.secadoSeg !== null || t.crackSeg !== null}
              onClick={() => marcar({ secadoSeg: transcurrido })}>Fin de secado</Button>
            <Button variant="claro" size="xl" disabled={t.crackSeg !== null} onClick={() => marcar({ crackSeg: transcurrido })}>1er crack</Button>
            <Button variant="aviso" size="xl" onClick={() => marcar({ descargaSeg: transcurrido })}>Finalizar curva</Button>
          </div>
        )}
      </div>
      {corriendo && t.secadoSeg === null && t.crackSeg === null && (
        <p className="m-0 text-sm text-verde-menta">Pulsa «Fin de secado» cuando el grano se ponga amarillo.</p>
      )}
      {corriendo && t.secadoSeg !== null && t.crackSeg === null && (
        <p className="m-0 text-sm text-verde-menta">El 1er crack suele darse con el grano cerca de 190 °C. Al pulsarlo arranca el tiempo desde el crack.</p>
      )}
      {t.iniciadaAt && (
        <div className="flex flex-wrap gap-3 text-bosque">
          <Momento label="Fin de secado" seg={t.secadoSeg} onGuardar={(s) => marcar({ secadoSeg: s })} />
          <Momento label="1er crack (pop)" seg={t.crackSeg} onGuardar={(s) => marcar({ crackSeg: s })} />
          <Momento label="Fin de curva" seg={t.descargaSeg} onGuardar={(s) => marcar({ descargaSeg: s })} />
        </div>
      )}
    </div>
  )
}

/** Hora de un momento (mm:ss), editable para corregirla o anotarla después. */
function Momento({ label, seg, onGuardar }: { label: string; seg: number | null; onGuardar: (s: number | null) => void }) {
  const id = useId()
  const [texto, setTexto] = useState(seg === null ? '' : mmss(seg))
  useEffect(() => setTexto(seg === null ? '' : mmss(seg)), [seg])
  const valor = leerMmss(texto)
  const malo = valor !== null && (isNaN(valor) || valor > MINUTO_MAXIMO * 60)
  return (
    <label htmlFor={id} className="flex items-center gap-2 rounded-lg bg-white/90 px-3 py-1.5">
      <span className="text-sm font-semibold">{label}</span>
      <input id={id} value={texto} placeholder="m:ss" inputMode="numeric" aria-invalid={malo || undefined}
        onChange={(e) => setTexto(e.target.value)}
        onBlur={() => { if (!malo && valor !== seg) onGuardar(valor) }}
        className={cx('h-10 w-20 rounded-md border bg-white px-2 text-center font-bold tabular-nums', malo ? 'border-peligro' : 'border-verde-salvia')} />
    </label>
  )
}

/**
 * Lectura de cada minuto. Con el cronómetro andando se registra sola cuando marca el minuto, con la temperatura
 * escrita y el aire y la llama elegidos. Sin cronómetro se elige el minuto y se registra a mano.
 */
function Captura({ t, completas, api }: { t: Tostion; completas: Lectura[]; api: TostionesApi }) {
  const id = useId()
  const [ahora, setAhora] = useState(Date.now())
  const corriendo = Boolean(t.iniciadaAt) && t.descargaSeg === null
  useEffect(() => {
    if (!corriendo) return
    const reloj = setInterval(() => setAhora(Date.now()), 1000)
    return () => clearInterval(reloj)
  }, [corriendo])

  const transcurrido = corriendo ? segundosDesde(t.iniciadaAt!, ahora) : 0
  // Último minuto que marcó el cronómetro; se va llenando el siguiente.
  const marca = Math.min(MINUTO_MAXIMO, Math.floor(transcurrido / 60))
  const ultimo = completas.length ? completas[completas.length - 1].segundo / 60 : -1
  const [elegido, setElegido] = useState<number | null>(null)
  const minuto = corriendo ? Math.min(MINUTO_MAXIMO, marca + 1) : elegido ?? Math.min(MINUTO_MAXIMO, Math.floor(ultimo) + 1)

  const [grano, setGrano] = useState('')
  const [aire, setAire] = useState<number | null>(null)
  const [llama, setLlama] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  // Aire y llama vigentes en un minuto: los de la última lectura anterior, o los iniciales.
  const previa = (m: number) => [...completas].reverse().find((l) => l.segundo <= m * 60)
  const aireVigente = previa(minuto)?.aire ?? t.aireInicial
  const llamaVigente = previa(minuto)?.llama ?? t.llamaInicial
  const yaHay = completas.find((l) => l.segundo === minuto * 60)

  /** Temperatura escrita: null si está vacía, NaN si no es válida. */
  function leerGrano() {
    const g = parseKg(grano)
    return g !== null && (isNaN(g) || g < -50 || g > 400) ? NaN : g
  }

  async function guardar(m: number, g: number | null) {
    const p = previa(m)
    const lectura = { segundo: m * 60, tempGrano: g, tempTambor: null, aire: aire ?? p?.aire ?? t.aireInicial, llama: llama ?? p?.llama ?? t.llamaInicial }
    // Se limpia antes de guardar: lo que se escriba mientras tanto queda para el minuto siguiente.
    setGrano(''); setAire(null); setLlama(null); setError(null)
    setGuardando(true)
    await api.ejecutar(() => guardarLectura(t.id, lectura))
    setGuardando(false)
  }

  // Cuando el cronómetro marca un minuto nuevo se registra lo escrito. Si no hay nada, ese minuto queda sin lectura.
  const marcaPrevia = useRef(marca)
  useEffect(() => {
    if (!corriendo || marca <= marcaPrevia.current) { marcaPrevia.current = marca; return }
    marcaPrevia.current = marca
    const g = leerGrano()
    if (Number.isNaN(g)) return setError(`No se registró el minuto ${marca}: temperatura no válida. Ej: 185,5`)
    if (g === null && aire === null && llama === null) return
    void guardar(marca, g)
  })

  async function registrar(e: FormEvent) {
    e.preventDefault()
    if (corriendo) return
    const g = leerGrano()
    if (g === null) return setError('Escribe la temperatura del grano.')
    if (Number.isNaN(g)) return setError('Temperatura no válida. Ej: 185,5')
    await guardar(minuto, g)
    setElegido(Math.min(MINUTO_MAXIMO, minuto + 1))
    document.getElementById(`${id}-grano`)?.focus()
  }

  return (
    <form onSubmit={(e) => void registrar(e)} className="flex flex-col gap-4 rounded-[14px] border-2 border-verde-salvia bg-panel p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h4 className="m-0 text-lg font-bold text-esmeralda-oscuro">Minuto {minuto}</h4>
        {!corriendo && (
          <div className="flex items-center gap-1" role="group" aria-label="Minuto">
            <button type="button" aria-label="Minuto anterior" onClick={() => setElegido(Math.max(0, minuto - 1))}
              className="flex h-12 w-12 items-center justify-center rounded-xl border border-verde-salvia bg-white"><Icon name="menos" size={22} /></button>
            <span className="w-12 text-center font-display text-2xl font-bold tabular-nums">{minuto}</span>
            <button type="button" aria-label="Minuto siguiente" onClick={() => setElegido(Math.min(MINUTO_MAXIMO, minuto + 1))}
              className="flex h-12 w-12 items-center justify-center rounded-xl border border-verde-salvia bg-white"><Icon name="mas" size={22} /></button>
          </div>
        )}
      </div>
      {corriendo && marca < MINUTO_MAXIMO && (
        <p className="m-0 -mt-2 text-[15px] text-pizarra">
          Se registra solo cuando el cronómetro marque <strong className="tabular-nums">{minuto}:00</strong> (faltan {mmss(minuto * 60 - transcurrido)}).
        </p>
      )}
      {yaHay && <p className="m-0 -mt-2 text-sm text-pizarra-suave">Este minuto ya tiene lectura: al registrar se reemplaza.</p>}

      <Campo id={`${id}-grano`} label="Temp. grano" sufijo="°C" value={grano} onChange={(v) => { setGrano(v); setError(null) }} inputMode="decimal" grande />
      <Opciones label="Aire" opciones={AIRES} valor={aire ?? aireVigente} sufijo="%" onElegir={setAire} />
      <Opciones label="Llama" opciones={LLAMAS} valor={llama ?? llamaVigente} sufijo="%" onElegir={setLlama} />
      {error && <FieldError>{error}</FieldError>}
      {!corriendo && (
        <Button type="submit" size="xxl" disabled={guardando} className="font-bold">
          {guardando ? 'Guardando…' : `Registrar minuto ${minuto}`}
        </Button>
      )}
    </form>
  )
}

function Resumen({ t }: { t: Tostion }) {
  const fases = fasesTostion(t)
  const marca = (s: number | null) => (s === null ? '—' : mmss(s))
  const datos: Array<[string, string]> = [
    ['Café verde', `${miles(t.gramosVerde)} g`],
    ['Carga', t.tempCarga === null ? '—' : `${kg(t.tempCarga)} °C`],
    ['Fin de secado', marca(t.secadoSeg)],
    ['1er crack', marca(t.crackSeg)],
    ['Fin de curva', marca(t.descargaSeg)],
  ]
  const porFase: Array<[string, string, Fase]> = [
    ['Secado', 'inicio → fin de secado', fases.secado],
    ['Maillard', 'fin de secado → 1er crack', fases.maillard],
    ['Desarrollo (DTR)', '1er crack → fin de curva', fases.desarrollo],
  ]
  return (
    <div className="flex flex-col gap-3 rounded-xl bg-rocio-claro p-3.5">
      <dl className="m-0 grid grid-cols-3 gap-3 sm:grid-cols-5">
        {datos.map(([k, v]) => (
          <div key={k}>
            <dt className="text-[13px] text-pizarra-suave">{k}</dt>
            <dd className="m-0 font-display text-lg font-bold tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>
      <dl aria-label="Fases respecto al tiempo total" className="m-0 grid grid-cols-1 gap-2 border-t border-linea pt-3 sm:grid-cols-3">
        {porFase.map(([nombre, tramo, f]) => (
          <div key={nombre} className="rounded-lg bg-white px-3 py-2">
            <dt className="text-[13px] text-pizarra-suave"><span className="font-semibold text-pizarra">{nombre}</span> · {tramo}</dt>
            <dd className="m-0 flex items-baseline justify-between gap-2 tabular-nums">
              <span className="font-display text-2xl font-bold">{f.pct === null ? '—' : `${dec(f.pct, 1)} %`}</span>
              <span className="text-[15px] text-pizarra-suave">{f.seg === null ? '' : mmss(f.seg)}</span>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

function TablaLecturas({ lecturas, editable, api }: { lecturas: Lectura[]; editable: boolean; api: TostionesApi }) {
  if (!lecturas.length) return <p className="m-0 text-[15px] text-pizarra-suave">Todavía no hay lecturas.</p>
  return (
    <div className="overflow-x-auto rounded-xl border border-linea">
      <table className="w-full border-collapse text-left tabular-nums">
        <caption className="sr-only">Lecturas de la tostión</caption>
        <thead>
          <tr className="bg-rocio-claro text-sm text-pizarra">
            <th className="px-3 py-2 font-semibold">Min</th>
            <th className="px-3 py-2 font-semibold">Grano °C</th>
            <th className="px-3 py-2 font-semibold">Aire %</th>
            <th className="px-3 py-2 font-semibold">Llama %</th>
            {editable && <th className="px-3 py-2"><span className="sr-only">Borrar</span></th>}
          </tr>
        </thead>
        <tbody>
          {lecturas.map((l) => (
            <tr key={l.id} className="border-t border-linea">
              <td className="px-3 py-2 font-semibold">{mmss(l.segundo)}</td>
              <td className="px-3 py-2">{l.tempGrano === null ? '—' : dec(l.tempGrano, 1)}</td>
              <td className="px-3 py-2">{l.aire ?? '—'}</td>
              <td className="px-3 py-2">{l.llama ?? '—'}</td>
              {editable && (
                <td className="px-1 py-1 text-right">
                  <button type="button" aria-label={`Borrar lectura del minuto ${mmss(l.segundo)}`}
                    onClick={() => void api.ejecutar(() => borrarLectura(l.id))}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-pizarra-suave hover:bg-red-50 hover:text-peligro">
                    <Icon name="eliminar" size={18} />
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Notas({ t, api }: { t: Tostion; api: TostionesApi }) {
  const id = useId()
  const [texto, setTexto] = useState(t.notas ?? '')
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-[15px] font-semibold">Notas de la tostión (opcional)</label>
      <textarea id={id} value={texto} maxLength={500} rows={2} onChange={(e) => setTexto(e.target.value)}
        onBlur={() => { if (texto.trim() !== (t.notas ?? '')) void api.ejecutar(() => actualizarTostion(t.id, { notas: texto.trim() || null })) }}
        placeholder="Ej: bajé la llama a 30 en el minuto 4, abrí aire al 75 en el crack"
        className="rounded-[10px] border border-verde-salvia bg-white px-4 py-3 text-base focus:border-esmeralda" />
    </div>
  )
}

function Eliminar({ t, api }: { t: Tostion; api: TostionesApi }) {
  const [confirmando, setConfirmando] = useState(false)
  if (!confirmando) {
    return (
      <Button variant="dangerOutline" size="lg" onClick={() => setConfirmando(true)} className="flex-1">
        <Icon name="eliminar" size={20} />
        Eliminar tostión
      </Button>
    )
  }
  return (
    <div className="flex w-full flex-col gap-2 rounded-[10px] bg-red-50 p-3">
      <span className="text-[15px] font-semibold text-red-800">¿Eliminar esta tostión y sus lecturas? No se puede deshacer.</span>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" size="lg" onClick={() => setConfirmando(false)}>No</Button>
        <Button variant="danger" size="lg" onClick={() => void api.eliminar(t)}>Sí, eliminar</Button>
      </div>
    </div>
  )
}

interface CampoProps {
  id: string
  label: string
  sufijo: string
  value: string
  onChange: (v: string) => void
  onBlur?: () => void
  inputMode?: 'numeric' | 'decimal'
  grande?: boolean
  /** Etiqueta solo para lectores de pantalla. */
  oculto?: boolean
}

function Campo({ id, label, sufijo, value, onChange, onBlur, inputMode = 'numeric', grande, oculto }: CampoProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={oculto ? 'sr-only' : 'text-[15px] font-semibold'}>{label}</label>
      <div className="relative">
        <input id={id} inputMode={inputMode} value={value} placeholder={oculto ? 'Otra' : '0'}
          onChange={(e) => onChange(e.target.value)} onBlur={onBlur}
          className={cx('w-full rounded-[10px] border border-verde-salvia bg-white pl-4 pr-12 font-bold tabular-nums focus:border-esmeralda',
            grande ? 'h-16 text-[28px]' : 'h-12 text-lg')} />
        <span className={cx('pointer-events-none absolute right-4 text-pizarra-suave', grande ? 'top-[18px] text-lg' : 'top-3')}>{sufijo}</span>
      </div>
    </div>
  )
}

interface OpcionesProps {
  label: string
  opciones: readonly number[]
  valor: number | null
  sufijo: string
  onElegir: (v: number) => void
}

/** Botones grandes para elegir un valor (aire, llama). */
function Opciones({ label, opciones, valor, sufijo, onElegir }: OpcionesProps) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1.5">
      <span id={id} className="text-[15px] font-semibold">{label}</span>
      <div role="group" aria-labelledby={id} className="grid grid-cols-5 gap-1.5">
        {opciones.map((v) => (
          <button key={v} type="button" aria-pressed={valor === v} onClick={() => onElegir(v)}
            className={cx('h-12 rounded-xl border-2 text-[15px] font-bold tabular-nums',
              valor === v ? 'border-esmeralda bg-esmeralda text-white' : 'border-linea-oscuro bg-white text-pizarra hover:bg-rocio-claro')}>
            {v}{sufijo}
          </button>
        ))}
      </div>
    </div>
  )
}
