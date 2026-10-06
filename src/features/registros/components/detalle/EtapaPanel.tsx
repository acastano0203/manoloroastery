import { useState } from 'react'
import { Button } from '../../../../components/ui/Button'
import { Icon } from '../../../../components/ui/Icon'
import { cx } from '../../../../lib/cx'
import { ETAPAS, etapaAnterior, etapasDe, PASO, siguienteEtapa } from '../../etapas'
import { useRegistros } from '../../hooks/useRegistros'
import type { Registro } from '../../types'

/** En qué etapa va el lote, con "Siguiente paso" y "Volver a…". */
export function EtapaPanel({ r }: { r: Registro }) {
  const { avanzar, regresar } = useRegistros()
  const [moviendo, setMoviendo] = useState(false)
  const etapas = etapasDe(r)
  const actual = ETAPAS.indexOf(r.etapa)
  const siguiente = siguienteEtapa(r)
  const anterior = etapaAnterior(r)

  async function mover(f: (r: Registro) => Promise<void>) {
    setMoviendo(true)
    await f(r)
    setMoviendo(false)
  }

  return (
    <section aria-label="Etapa del lote" className="flex flex-col gap-4 rounded-[14px] border border-arena bg-white p-4 sm:p-5">
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
                  hecho && 'border-dorado-oscuro bg-dorado text-cafe',
                  aqui && 'border-vino bg-vino text-white',
                  !hecho && !aqui && 'border-arena-oscuro bg-white text-cafe-suave',
                )}
              >
                {hecho ? <Icon name="check" size={18} /> : etapas.indexOf(e) + 1}
              </span>
              <span className={cx('text-[13px] leading-tight [overflow-wrap:anywhere]', aqui ? 'font-bold text-vino' : 'text-cafe-medio')}>{e}</span>
            </li>
          )
        })}
      </ol>
      {r.llegada === 'Verde' && <p className="m-0 text-[15px] text-cafe-suave">Llegó en verde: no pasa por trilla.</p>}

      {siguiente && (
        <Button size="xxl" onClick={() => void mover(avanzar)} disabled={moviendo} className="w-full font-bold">
          Siguiente paso · {PASO[siguiente]}
          <Icon name="adelante" size={24} />
        </Button>
      )}
      {anterior && (
        <Button variant="link" onClick={() => void mover(regresar)} disabled={moviendo} className="self-center">
          <Icon name="atras" size={18} />
          Volver a {anterior}
        </Button>
      )}
    </section>
  )
}
