import { Link } from 'react-router-dom'
import { buttonClass } from '../../../components/ui/buttonClass'
import { Icon } from '../../../components/ui/Icon'
import { fecha } from '../../../lib/format'
import type { Registro } from '../types'
import { calcularCobro } from '../utils'
import { EstadoBadge } from './EstadoBadge'
import { TablaEncabezado } from './TablaEncabezado'

interface Props {
  lista: Registro[]
  vacioTxt: string
}

/** Registros enviados: tabla en escritorio, tarjetas en celular. */
export function HistorialLista({ lista, vacioTxt }: Props) {
  const filas = lista.map((r) => ({ r, c: calcularCobro(r, r.precios) }))
  return (
    <>
      <div className="hidden overflow-x-auto rounded-xl border border-arena bg-white md:block">
        <table className="w-full border-collapse text-left tabular-nums">
          <TablaEncabezado ultima="Remisión" />
          <tbody>
            {filas.map(({ r, c }) => (
              <tr key={r.id} className="border-t border-arena">
                <td className="px-5 py-3 text-cafe-medio">{fecha(r.fecha)}</td>
                <td className="px-5 py-3">
                  <Link to={`/registros/${r.id}`} className="font-semibold text-cafe underline decoration-dorado underline-offset-[3px]">
                    {r.cliente}
                  </Link>
                </td>
                <td className="px-5 py-3 text-right">{c.librasTxt}</td>
                <td className="px-5 py-3 text-right font-semibold">{c.totalTxt}</td>
                <td className="px-5 py-3 text-cafe-medio">{r.pago}</td>
                <td className="px-5 py-3"><EstadoBadge estado={r.estado} /></td>
                <td className="px-5 py-3 text-right">
                  <Link to={`/registros/${r.id}/remision`} className={buttonClass('outline', 'sm')}>
                    <Icon name="compartir" size={18} />
                    Compartir
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filas.length === 0 && <div className="px-5 py-8 text-center text-cafe-suave">{vacioTxt}</div>}
      </div>

      <div className="flex flex-col gap-2.5 md:hidden">
        {filas.map(({ r, c }) => (
          <div key={r.id} className="flex flex-col gap-2 rounded-xl border border-arena bg-white p-4">
            <Link to={`/registros/${r.id}`} className="flex w-full items-baseline justify-between gap-3 text-cafe no-underline">
              <span className="text-[17px] font-semibold">{r.cliente}</span>
              <span className="whitespace-nowrap text-[17px] font-bold tabular-nums">{c.totalTxt}</span>
            </Link>
            <div className="flex items-center justify-between gap-3">
              <div className="text-[15px] text-cafe-suave">{fecha(r.fecha)} · {c.librasTxt} · {r.pago}</div>
              <Link to={`/registros/${r.id}/remision`} className={buttonClass('outline', 'sm', 'shrink-0')}>
                <Icon name="compartir" size={18} />
                Remisión
              </Link>
            </div>
          </div>
        ))}
        {filas.length === 0 && <div className="px-4 py-6 text-center text-cafe-suave">{vacioTxt}</div>}
      </div>
    </>
  )
}
