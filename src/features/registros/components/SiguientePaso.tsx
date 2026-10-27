import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { Button } from '../../../components/ui/Button'
import type { ButtonSize } from '../../../components/ui/buttonClass'
import { Icon } from '../../../components/ui/Icon'
import { kg, kgDeG, parseG, parseKgAG } from '../../../lib/format'
import { usePermisos } from '../../admin/hooks/usePermisos'
import { PASO, siguienteEtapa } from '../etapas'
import { validarGramos, validarSobrante, validarTostado } from '../formulario'
import { useRegistros } from '../hooks/useRegistros'
import type { DatosPaso } from '../services/registrosService'
import type { Etapa, Registro } from '../types'
import { aGramos, calcularCobro } from '../utils'
import { AlmacenamientoCampos, leerCantidad, textoCantidad, validarAlmacen, type AlmacenBorrador } from './form/AlmacenamientoCampos'
import { EmpaqueCampos, type EmpaqueBorrador } from './form/BolsasSelector'
import { DescripcionCampo } from './form/DescripcionCampo'
import { PresentacionCampos, validarPresentacion, type PresentacionBorrador } from './form/PresentacionCampos'
import { GramosInput } from './form/GramosInput'
import { Merma } from './form/Merma'

/** Pasos en los que se anota algo antes de mover el lote. */
export const PIDE_DATOS: ReadonlySet<Etapa> = new Set(['Tostado', 'Empacado', 'Entregado'])

interface Props {
  r: Registro
  size: ButtonSize
  /** "Siguiente paso · Tostar" en vez de solo "Tostar". */
  larga?: boolean
  className?: string
}

/** Botón que pasa el lote a la etapa siguiente. Al tostar pide el café a tostar; al empacar, las bolsas. */
export function SiguientePaso({ r, size, larga, className }: Props) {
  const { avanzar } = useRegistros()
  const { puede } = usePermisos()
  const idBoton = useId()
  const [abierto, setAbierto] = useState(false)
  const [moviendo, setMoviendo] = useState(false)
  const cerrar = useCallback(() => {
    setAbierto(false)
    document.getElementById(idBoton)?.focus()
  }, [idBoton])
  const siguiente = siguienteEtapa(r)
  if (!siguiente || !puede('tablero')) return null

  async function mover(datos?: DatosPaso) {
    setMoviendo(true)
    await avanzar(r, datos)
    setMoviendo(false)
    setAbierto(false)
  }

  return (
    <>
      <Button id={idBoton} size={size} disabled={moviendo} className={className} aria-haspopup={PIDE_DATOS.has(siguiente) ? 'dialog' : undefined}
        onClick={() => (PIDE_DATOS.has(siguiente) ? setAbierto(true) : void mover())}>
        {larga ? `Siguiente paso · ${PASO[siguiente]}` : PASO[siguiente]}
        <Icon name="adelante" size={22} />
      </Button>
      {abierto && <PasoDialog r={r} etapa={siguiente} moviendo={moviendo} onCerrar={cerrar} onConfirmar={(d) => void mover(d)} />}
    </>
  )
}

interface DialogProps {
  r: Registro
  etapa: Etapa
  moviendo: boolean
  onCerrar: () => void
  onConfirmar: (datos: DatosPaso) => void
}

/**
 * Ventana para anotar lo de cada paso antes de mover el lote: el peso en almendra al tostar;
 * peso tostado, bolsas y drips al empacar; y si queda almacenado, al entregar.
 */
export function PasoDialog({ r, etapa, moviendo, onCerrar, onConfirmar }: DialogProps) {
  const idTitulo = useId()
  const idGramos = useId()
  const idTostado = useId()
  const caja = useRef<HTMLFormElement>(null)
  const esTostar = etapa === 'Tostado'
  const esEntregar = etapa === 'Entregado'
  const [gramos, setGramos] = useState(r.gramos ? kgDeG(r.gramos) : '')
  const [intentado, setIntentado] = useState(false)
  const [empaque, setEmpaque] = useState<EmpaqueBorrador>({
    n340: r.n340, n500: r.n500, n2500: r.n2500, nDrip: r.nDrip, bolsasCliente: r.bolsasCliente,
    gramosTostado: r.gramosTostado ? kgDeG(r.gramosTostado) : '',
    gramosSobrante: r.gramosSobrante === null ? '' : String(r.gramosSobrante),
  })
  const [almacen, setAlmacen] = useState<AlmacenBorrador>({
    requiere: r.almacenamiento ? true : null, dias: r.almacenamiento?.dias ?? 1,
    unidad: 'kg',
    cantidad: r.almacenamiento ? textoCantidad(r.almacenamiento.gramos, 'kg') : r.gramosTostado ? kgDeG(r.gramosTostado) : '',
    marcado: r.almacenamiento?.marcado ?? '', foto: null,
  })

  const [presentacion, setPresentacion] = useState<PresentacionBorrador>({ presentacion: r.presentacion, molienda: r.molienda })
  const [descripcion, setDescripcion] = useState(r.descripciones[etapa] ?? '')
  // Solo se manda si se escribió algo distinto de lo que ya había.
  const conDescripcion = descripcion.trim() !== (r.descripciones[etapa] ?? '')
    ? { descripciones: { ...r.descripciones, [etapa]: descripcion } }
    : {}

  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => { if (e.key === 'Escape') onCerrar() }
    document.addEventListener('keydown', alTeclear)
    // Si ningún campo tomó el foco con autoFocus, el foco va a la ventana.
    if (!caja.current?.contains(document.activeElement)) caja.current?.focus()
    return () => document.removeEventListener('keydown', alTeclear)
  }, [onCerrar])

  const tg = parseKgAG(empaque.gramosTostado)
  // Mientras no se escriba el peso tostado, el cobro se estima con la almendra.
  const tostadoValido = tg !== null && !isNaN(tg) && tg > 0 ? tg : null
  const g = parseKgAG(gramos)
  const gValidos = g !== null && !isNaN(g) && g > 0 ? g : 0
  const cobro = esTostar
    ? calcularCobro({ ...r, gramos: gValidos }, r.precios)
    : calcularCobro({ ...r, ...empaque, gramosTostado: tostadoValido }, r.precios)
  const aviso = esTostar && gValidos > r.kilos * 1000
    ? `Es más de lo recibido (${kg(r.kilos)} kg). Revisa las cantidades.`
    : null

  const errorTostado = etapa === 'Empacado' ? validarTostado(empaque.gramosTostado, r.gramos, true) : undefined
  const errorSobrante = etapa === 'Empacado' ? validarSobrante(empaque.gramosSobrante, empaque.gramosTostado) : undefined
  const errorPresentacion = etapa === 'Empacado' ? validarPresentacion(presentacion) : undefined
  const erroresAlmacen = esEntregar ? validarAlmacen(almacen, r.gramosTostado) : {}

  function confirmar(e: FormEvent) {
    e.preventDefault()
    if (esEntregar) {
      if (Object.keys(erroresAlmacen).length) return setIntentado(true)
      return onConfirmar({
        almacenamiento: almacen.requiere
          ? { dias: almacen.dias, gramos: aGramos(leerCantidad(almacen.cantidad, almacen.unidad)!, almacen.unidad), unidad: almacen.unidad,
            marcado: almacen.marcado, foto: almacen.foto! }
          : null,
        ...conDescripcion,
      })
    }
    if (!esTostar) {
      if (errorTostado || errorSobrante || errorPresentacion) return setIntentado(true)
      const { gramosTostado: _texto, gramosSobrante: _sobrante, ...cantidades } = empaque
      return onConfirmar({
        ...cantidades, gramosTostado: parseKgAG(empaque.gramosTostado)!, gramosSobrante: parseG(empaque.gramosSobrante),
        presentacion: presentacion.presentacion!, molienda: presentacion.molienda, ...conDescripcion,
      })
    }
    if (validarGramos(gramos)) return setIntentado(true)
    onConfirmar({ gramos: gValidos, ...conDescripcion })
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-[rgba(18,38,32,0.45)] sm:items-center sm:p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onCerrar() }}>
      <form ref={caja} role="dialog" aria-modal="true" aria-labelledby={idTitulo} tabIndex={-1} onSubmit={confirmar}
        className="flex max-h-[92vh] w-full max-w-[480px] flex-col gap-4 overflow-y-auto rounded-t-2xl bg-white p-5 outline-none sm:rounded-2xl">
        <div className="flex items-start gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <h2 id={idTitulo} className="m-0 text-2xl font-bold">{PASO[etapa]}</h2>
            <p className="m-0 text-[15px] text-pizarra-suave">{r.cliente} · {r.codigo} · {kg(r.kilos)} kg recibidos</p>
          </div>
          <button type="button" onClick={onCerrar} aria-label="Cerrar" className="-mr-2 -mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg">
            <Icon name="cerrar" size={22} />
          </button>
        </div>

        {esEntregar ? (
          <AlmacenamientoCampos valores={almacen} cambiar={(p) => setAlmacen((v) => ({ ...v, ...p }))} errores={intentado ? erroresAlmacen : {}} />
        ) : esTostar ? (
          <GramosInput id={idGramos} value={gramos} onChange={setGramos} autoFocus aviso={aviso} librasTxt={cobro.librasTxt}
            error={intentado && validarGramos(gramos)}>
            <Merma r={{ ...r, gramos: gValidos || null }} />
          </GramosInput>
        ) : (
          <>
          <PresentacionCampos valores={presentacion} cambiar={setPresentacion} error={intentado && errorPresentacion} />
          <EmpaqueCampos idTostado={idTostado} valores={empaque} cambiar={(p) => setEmpaque((v) => ({ ...v, ...p }))} autoFocus
            precios={r.precios} gramosAlmendra={r.gramos} errorTostado={intentado && errorTostado}
            errorSobrante={intentado && errorSobrante} />
          </>
        )}

        <DescripcionCampo etapa={etapa} value={descripcion} onChange={setDescripcion} opcional />

        <div className="flex flex-col gap-0.5 rounded-xl bg-rocio-claro px-4 py-3">
          <span className="flex items-baseline justify-between gap-3">
            <span className="font-semibold">Cobro hasta ahora</span>
            <span className="font-display text-2xl font-bold text-esmeralda-oscuro tabular-nums">{cobro.totalTxt}</span>
          </span>
          <span className="text-[13px] text-pizarra-suave">{cobro.fTotal}</span>
        </div>

        <div className="grid grid-cols-[1fr_2fr] gap-2">
          <Button variant="outline" size="xl" onClick={onCerrar}>Cancelar</Button>
          <Button type="submit" size="xl" disabled={moviendo} className="font-bold">
            {moviendo ? 'Guardando…' : `Pasar a ${etapa}`}
          </Button>
        </div>
      </form>
    </div>
  )
}
