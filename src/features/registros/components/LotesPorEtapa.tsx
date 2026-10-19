import {
  DndContext, DragOverlay, MouseSensor, pointerWithin, TouchSensor, useDroppable, useSensor, useSensors,
  type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core'
import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { Icon } from '../../../components/ui/Icon'
import { cx } from '../../../lib/cx'
import { fecha, kg } from '../../../lib/format'
import { ETAPAS, movimientoA } from '../etapas'
import { useRegistros } from '../hooks/useRegistros'
import type { DatosPaso } from '../services/registrosService'
import type { Etapa, Registro } from '../types'
import { LoteTarjeta } from './LoteTarjeta'
import { PasoDialog, PIDE_DATOS } from './SiguientePaso'

const COLUMNAS: ReadonlyArray<{ etapa: Etapa; titulo: string; texto: string }> = [
  { etapa: 'Recibido', titulo: 'Recibido', texto: 'Por trillar (pergamino) o tostar (verde)' },
  { etapa: 'Trillado', titulo: 'Trillado', texto: 'Por tostar' },
  { etapa: 'Tostado', titulo: 'Tostado', texto: 'Por empacar' },
  { etapa: 'Empacado', titulo: 'Empacado', texto: 'Listo para entregar' },
  { etapa: 'Entregado', titulo: 'Entregado', texto: 'Por enviar a contabilidad' },
]

const loteDe = (e: { active: { data: { current?: Record<string, unknown> } } }) => e.active.data.current?.r as Registro | undefined

/** Tablero de lotes en proceso: una columna por etapa, de izquierda a derecha. Los enviados van en el Historial. */
export function LotesPorEtapa() {
  const { registros, avanzar, regresar } = useRegistros()
  const [arrastrado, setArrastrado] = useState<Registro | null>(null)
  // Soltado en Tostado o Empacado: falta anotar el café a tostar o las bolsas.
  const [porAnotar, setPorAnotar] = useState<{ r: Registro; etapa: Etapa } | null>(null)
  const [moviendo, setMoviendo] = useState(false)

  const sensores = useSensors(
    // El mouse arrastra después de moverse un poco, para que los clics en la tarjeta sigan funcionando.
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    // En el celular hay que mantener presionado, para no confundir el arrastre con deslizar el tablero.
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
  )

  const grupos = useMemo(() => {
    const m = new Map<Etapa, Registro[]>(ETAPAS.map((e) => [e, []]))
    // Los más antiguos primero: son los que llevan más tiempo esperando.
    for (const r of [...registros].reverse()) {
      if (r.etapa === 'Entregado' && r.estado === 'Enviado') continue
      m.get(r.etapa)?.push(r)
    }
    return m
  }, [registros])

  function alSoltar(e: DragEndEvent) {
    setArrastrado(null)
    const r = loteDe(e)
    const etapa = e.over?.id as Etapa | undefined
    if (!r || !etapa) return
    const mov = movimientoA(r, etapa)
    if (mov === 'regresar') void regresar(r)
    else if (mov === 'avanzar') {
      if (PIDE_DATOS.has(etapa)) setPorAnotar({ r, etapa })
      else void avanzar(r)
    }
  }

  const cerrar = useCallback(() => setPorAnotar(null), [])
  async function confirmar(datos: DatosPaso) {
    if (!porAnotar) return
    setMoviendo(true)
    await avanzar(porAnotar.r, datos)
    setMoviendo(false)
    setPorAnotar(null)
  }

  return (
    <section aria-labelledby="t-proceso" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="t-proceso" className="m-0 text-xl font-bold">Lotes en proceso</h2>
        <p className="m-0 text-[15px] text-pizarra-suave">
          <span className="md:hidden">Desliza para ver todas las etapas. Mantén presionado un lote para arrastrarlo.</span>
          <span className="hidden md:inline">Arrastra un lote a la etapa siguiente o a la anterior.</span>
        </p>
      </div>
      <DndContext sensors={sensores} collisionDetection={pointerWithin}
        onDragStart={(e: DragStartEvent) => setArrastrado(loteDe(e) ?? null)}
        onDragEnd={alSoltar} onDragCancel={() => setArrastrado(null)}>
        {/* Sin imán mientras se arrastra: pelearía con el desplazamiento automático hacia los bordes. */}
        <ol className={cx('-mx-4 m-0 flex list-none gap-3 overflow-x-auto px-4 pb-3 md:mx-0 md:px-0', !arrastrado && 'snap-x snap-mandatory')}>
          {COLUMNAS.map((col, i) => {
            const lista = grupos.get(col.etapa) ?? []
            return (
              <Columna key={col.etapa} etapa={col.etapa} titulo={col.titulo} texto={col.texto} numero={i + 1}
                total={lista.length} flecha={i < COLUMNAS.length - 1}
                destino={arrastrado && arrastrado.etapa !== col.etapa ? movimientoA(arrastrado, col.etapa) !== null : null}>
                {lista.map((r) => <LoteTarjeta key={r.id} r={r} />)}
              </Columna>
            )
          })}
        </ol>
        <DragOverlay dropAnimation={null}>{arrastrado && <TarjetaFlotante r={arrastrado} />}</DragOverlay>
      </DndContext>
      {porAnotar && (
        <PasoDialog r={porAnotar.r} etapa={porAnotar.etapa} moviendo={moviendo} onCerrar={cerrar} onConfirmar={(d) => void confirmar(d)} />
      )}
    </section>
  )
}

interface ColumnaProps {
  etapa: Etapa
  titulo: string
  texto: string
  numero: number
  total: number
  flecha: boolean
  /** Mientras se arrastra: true si el lote se puede soltar aquí, false si no. null si no se está arrastrando. */
  destino: boolean | null
  children: ReactNode
}

function Columna({ etapa, titulo, texto, numero, total, flecha, destino, children }: ColumnaProps) {
  const { setNodeRef, isOver } = useDroppable({ id: etapa, disabled: destino === false })
  const id = `etapa-${etapa}`
  return (
    <li ref={setNodeRef} aria-labelledby={id}
      className={cx(
        'flex w-[min(85vw,320px)] shrink-0 snap-start flex-col gap-3 rounded-[14px] border p-3 transition-colors md:w-auto md:min-w-[270px] md:flex-1',
        destino === null && 'border-linea bg-rocio-claro',
        destino === true && !isOver && 'border-dashed border-esmeralda bg-esmeralda/5',
        destino === true && isOver && 'border-esmeralda bg-esmeralda/15 ring-2 ring-esmeralda',
        destino === false && 'border-linea bg-rocio-claro opacity-50',
      )}>
      <div className="flex flex-col gap-1 px-1 pt-1">
        <div className="flex items-center gap-2">
          <span className={total > 0
            ? 'flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-esmeralda text-sm font-bold text-white'
            : 'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-linea-oscuro bg-white text-sm font-bold text-pizarra-suave'}>
            {numero}
          </span>
          <h3 id={id} className="m-0 flex-1 text-[17px] font-bold">{titulo}</h3>
          <span className="rounded-full bg-white px-2.5 py-0.5 text-sm font-bold tabular-nums text-pizarra" aria-label={`${total} lotes`}>
            {total}
          </span>
          {flecha && <span className="hidden text-verde-salvia md:flex" aria-hidden><Icon name="adelante" size={18} /></span>}
        </div>
        <p className="m-0 text-[13px] text-pizarra-suave">{texto}</p>
      </div>
      {total > 0 ? (
        <div className="flex flex-col gap-2.5">{children}</div>
      ) : (
        <div className="rounded-xl border border-dashed border-linea-oscuro px-4 py-6 text-center text-[15px] text-pizarra-suave">
          {destino ? 'Suelta aquí' : 'Ninguno'}
        </div>
      )}
    </li>
  )
}

/** La tarjeta que sigue al puntero mientras se arrastra. */
function TarjetaFlotante({ r }: { r: Registro }) {
  return (
    <div className="flex w-[min(85vw,300px)] cursor-grabbing flex-col gap-1 rounded-xl border border-esmeralda bg-white p-3.5 shadow-[0_12px_32px_rgba(18,38,32,0.25)] md:-rotate-2">
      <span className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 text-[17px] font-semibold [overflow-wrap:anywhere]">{r.cliente}</span>
        <span className="whitespace-nowrap text-sm font-semibold text-pizarra-suave">{r.codigo}</span>
      </span>
      <span className="text-[15px] text-pizarra-suave tabular-nums">{fecha(r.fecha)} · {r.proceso} · {kg(r.kilos)} kg</span>
    </div>
  )
}
