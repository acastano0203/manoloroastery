import { useState } from 'react'
import { Button } from '../../../../components/ui/Button'
import { Icon } from '../../../../components/ui/Icon'
import { cx } from '../../../../lib/cx'
import { fechaHora } from '../../../../lib/format'
import { ETAPAS, etapaAnterior, etapasDe } from '../../etapas'
import { usePermisos } from '../../../admin/hooks/usePermisos'
import { useRegistros } from '../../hooks/useRegistros'
import type { Registro } from '../../types'
import { SiguientePaso } from '../SiguientePaso'

/** En qué etapa va el lote, con "Siguiente paso" y "Volver a…". */
export function EtapaPanel({ r }: { r: Registro }) {
  const { regresar } = useRegistros()
  const { puede } = usePermisos()
  const [moviendo, setMoviendo] = useState(false)
  const etapas = etapasDe(r)
  const actual = ETAPAS.indexOf(r.etapa)
  const anterior = etapaAnterior(r)

  async function volver() {
    setMoviendo(true)
    await regresar(r)
    setMoviendo(false)
  }

  return (
    <section aria-label="Etapa del lote" className="flex flex-col gap-4 rounded-[14px] border border-linea bg-white p-4 sm:p-5">
      <ol className="m-0 grid list-none gap-1.5 p-0" style={{ gridTemplateColumns: `repeat(${etapas.length}, minmax(0, 1fr))` }}>
        {etapas.map((e) => {
          const i = ETAPAS.indexOf(e)
          const hecho = i < actual
          const aqui = e === r.etapa
          return (
            <li key={e} aria-current={aqui ? 'step' : undefined} className="flex flex-col items-center gap-1.5 text-center">
              <span
                className={cx(
                  'flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-bold',
                  hecho && 'border-verde-olivo bg-verde-olivo/15 text-verde-botella',
                  aqui && 'border-esmeralda bg-esmeralda text-white',
                  !hecho && !aqui && 'border-linea-oscuro bg-white text-pizarra-suave',
                )}
              >
                {hecho ? <Icon name="check" size={18} /> : etapas.indexOf(e) + 1}
              </span>
              <span className={cx('text-[13px] leading-tight [overflow-wrap:anywhere]', aqui ? 'font-bold text-esmeralda-oscuro' : 'text-pizarra')}>{e}</span>
              {r.fechasEtapas[e] && (
                <time dateTime={r.fechasEtapas[e]} className="text-xs leading-tight text-pizarra-suave tabular-nums">
                  {fechaHora(r.fechasEtapas[e]).split(' · ').map((parte) => <span key={parte} className="block">{parte}</span>)}
                </time>
              )}
            </li>
          )
        })}
      </ol>
      {r.llegada === 'Verde' && <p className="m-0 text-[15px] text-pizarra-suave">Llegó en verde: no pasa por trilla.</p>}

      <SiguientePaso r={r} size="xxl" larga className="w-full font-bold" />
      {anterior && puede('tablero') && (
        <Button variant="link" onClick={() => void volver()} disabled={moviendo} className="self-center">
          <Icon name="atras" size={18} />
          Volver a {anterior}
        </Button>
      )}
    </section>
  )
}
