import { useDraggable } from '@dnd-kit/core'
import { Link } from 'react-router-dom'
import { Button } from '../../../components/ui/Button'
import { buttonClass } from '../../../components/ui/buttonClass'
import { Icon } from '../../../components/ui/Icon'
import { cx } from '../../../lib/cx'
import { fecha, fechaHora, kg, kgDeG } from '../../../lib/format'
import { siguienteEtapa } from '../etapas'
import { usePermisos } from '../../admin/hooks/usePermisos'
import { useRegistros } from '../hooks/useRegistros'
import type { Registro } from '../types'
import { calcularCobro } from '../utils'
import { EstadoBadge } from './EstadoBadge'
import { SiguientePaso } from './SiguientePaso'

/**
 * Un lote en el tablero: datos clave y el botón grande del siguiente paso. Se puede arrastrar a la etapa vecina.
 * turno: su lugar en la fila de la etapa por orden de llegada (1 = el que sigue).
 */
export function LoteTarjeta({ r, turno }: { r: Registro; turno?: number }) {
  const llegada = r.fechasEtapas[r.etapa]
  const { enviar } = useRegistros()
  const siguiente = siguienteEtapa(r)
  const c = calcularCobro(r, r.precios)
  const enviando = r.estado === 'Enviando'
  const { puede } = usePermisos()
  const mueve = puede('tablero')
  const { setNodeRef, listeners, isDragging } = useDraggable({ id: r.id, data: { r }, disabled: enviando || !mueve })
  // Sin teclado: con Enter o espacio en los botones de adentro arrancaría un arrastre. Desde el teclado se usan los botones.
  const { onKeyDown: _sinTeclado, ...punteros } = listeners ?? {}

  return (
    <div ref={setNodeRef} {...punteros}
      className={cx(mueve && 'cursor-grab', 'flex touch-manipulation select-none flex-col gap-3 rounded-xl border border-linea bg-white p-3.5 shadow-[0_1px_2px_rgba(18,38,32,0.06)] [-webkit-touch-callout:none]',
        isDragging && 'opacity-40')}>
      <Link to={`/registros/${r.id}`} draggable={false} className="flex w-full flex-col gap-1 text-bosque no-underline">
        <span className="flex w-full items-baseline justify-between gap-3">
          <span className="min-w-0 text-[17px] font-semibold [overflow-wrap:anywhere]">{r.cliente}</span>
          <span className="whitespace-nowrap text-sm font-semibold text-pizarra-suave">{r.codigo}</span>
        </span>
        {turno !== undefined && (
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px]">
            <span className={cx('rounded-full px-2.5 py-0.5 font-bold tabular-nums',
              turno === 1 ? 'bg-esmeralda text-white' : 'bg-rocio-claro text-pizarra')}>
              {turno === 1 ? 'En turno' : `Turno ${turno}`}
            </span>
            {llegada && <span className="text-pizarra-suave tabular-nums">Llegó {fechaHora(llegada)}</span>}
          </span>
        )}
        {r.reabiertoAt && r.estado !== 'Enviado' && (
          <span className="self-start rounded-full bg-amber-100 px-2.5 py-0.5 text-[13px] font-semibold text-amber-800">Reabierto</span>
        )}
        <span className="text-[15px] text-pizarra-suave tabular-nums">
          {fecha(r.fecha)} · {r.proceso} · {kg(r.kilos)} kg{r.gramos !== null && ` · ${kgDeG(r.gramos)} kg en almendra`}
        </span>
        {!siguiente && (
          <span className="flex w-full items-center justify-between gap-2 pt-1">
            <span className="text-[17px] font-bold tabular-nums">{c.totalTxt}</span>
            <EstadoBadge estado={r.estado} />
          </span>
        )}
      </Link>

      {siguiente ? (
        <SiguientePaso r={r} size="lg" className="w-full font-bold" />
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {r.estado === 'Enviado' ? (
            <Link to={`/registros/${r.id}/remision`} className={buttonClass('primary', 'lg', 'col-span-2 font-bold')}>
              <Icon name="compartir" size={20} />
              Remisión
            </Link>
          ) : (
            <>
              <Link to={`/registros/${r.id}`} className={buttonClass('outline', 'lg', 'px-2')}>Ver lote</Link>
              <Button size="lg" onClick={() => void enviar(r.id)} disabled={enviando || !mueve} className="px-2 font-bold">
                <Icon name="enviar" size={20} />
                {enviando ? 'Enviando…' : r.estado === 'Error' ? 'Reenviar' : 'Enviar'}
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
