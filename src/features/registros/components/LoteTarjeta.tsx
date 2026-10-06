import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../../../components/ui/Button'
import { buttonClass } from '../../../components/ui/buttonClass'
import { Icon } from '../../../components/ui/Icon'
import { dec, fecha, kg } from '../../../lib/format'
import { PASO, siguienteEtapa } from '../etapas'
import { useRegistros } from '../hooks/useRegistros'
import type { Registro } from '../types'
import { calcularCobro } from '../utils'
import { EstadoBadge } from './EstadoBadge'

/** Un lote en la pantalla de Registros: datos clave y el botón grande del siguiente paso. */
export function LoteTarjeta({ r }: { r: Registro }) {
  const { avanzar, enviar } = useRegistros()
  const [moviendo, setMoviendo] = useState(false)
  const siguiente = siguienteEtapa(r)
  const c = calcularCobro(r, r.precios)
  const enviando = r.estado === 'Enviando'

  async function siguientePaso() {
    setMoviendo(true)
    await avanzar(r)
    setMoviendo(false)
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-arena bg-white p-4">
      <Link to={`/registros/${r.id}`} className="flex w-full flex-col gap-1 text-cafe no-underline">
        <span className="flex w-full items-baseline justify-between gap-3">
          <span className="text-[17px] font-semibold">{r.cliente}</span>
          <span className="whitespace-nowrap text-sm font-semibold text-cafe-suave">{r.codigo}</span>
        </span>
        <span className="text-[15px] text-cafe-suave tabular-nums">
          {fecha(r.fecha)} · {r.proceso} · {kg(r.kilos)} kg · tostar {dec(r.gramos, 0)} g
        </span>
        {!siguiente && (
          <span className="flex w-full items-center justify-between gap-2 pt-1">
            <span className="text-[17px] font-bold tabular-nums">{c.totalTxt}</span>
            <EstadoBadge estado={r.estado} />
          </span>
        )}
      </Link>

      {siguiente ? (
        <Button size="xl" onClick={() => void siguientePaso()} disabled={moviendo} className="w-full font-bold">
          Siguiente paso · {PASO[siguiente]}
          <Icon name="adelante" size={22} />
        </Button>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {r.estado === 'Enviado' ? (
            <Link to={`/registros/${r.id}/remision`} className={buttonClass('primary', 'xl', 'col-span-2 font-bold')}>
              <Icon name="compartir" size={20} />
              Remisión
            </Link>
          ) : (
            <>
              <Link to={`/registros/${r.id}`} className={buttonClass('outline', 'xl')}>Ver lote</Link>
              <Button size="xl" onClick={() => void enviar(r.id)} disabled={enviando} className="font-bold">
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
