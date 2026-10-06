import { NEGOCIO } from '../negocio'
import type { DatosRemision } from '../types'

/** Vista en pantalla del PDF de la remisión. */
export function RemisionDocumento({ d }: { d: DatosRemision }) {
  return (
    <article className="flex flex-col gap-[22px] rounded border border-arena bg-white px-5 py-7 shadow-[0_2px_12px_rgba(28,25,23,0.08)] sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-vino pb-[18px]">
        <div className="flex flex-col gap-0.5">
          <div className="text-[19px] font-bold text-vino">{NEGOCIO.nombre}</div>
          <div className="text-[13px] text-cafe-suave">NIT {NEGOCIO.nit} · {NEGOCIO.ciudad}</div>
          <div className="text-[13px] text-cafe-suave">{NEGOCIO.celular}</div>
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <div className="text-xs font-bold tracking-[0.06em] text-cafe-suave">REMISIÓN</div>
          <div className="text-[21px] font-bold tabular-nums">{d.codigo}</div>
          <div className="text-[13px] text-cafe-suave">{d.fechaLarga}</div>
        </div>
      </div>

      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-bold tracking-[0.04em] text-cafe-suave">CLIENTE</dt>
          <dd className="text-base font-bold">{d.cliente}</dd>
          <dd className="text-sm text-cafe-medio">{d.celularTxt}</dd>
        </div>
        <div>
          <dt className="text-xs font-bold tracking-[0.04em] text-cafe-suave">CAFÉ RECIBIDO</dt>
          <dd className="text-base font-bold">{d.proceso} · {d.kilosTxt}</dd>
          <dd className="text-sm text-cafe-medio">Tostado: {d.gramosTxt}</dd>
        </div>
      </dl>

      <table className="w-full border-collapse text-left tabular-nums">
        <thead>
          <tr className="text-xs text-cafe-suave">
            <th className="border-b border-arena pb-2 font-semibold">Concepto</th>
            <th className="border-b border-arena pb-2 text-right font-semibold">Valor</th>
          </tr>
        </thead>
        <tbody>
          {d.lineas.map((l) => (
            <tr key={l.concepto}>
              <td className="border-b border-crema-claro py-2.5">
                <div className="text-[15px] font-semibold">{l.concepto}</div>
                <div className="text-[13px] text-cafe-suave">{l.detalle}</div>
              </td>
              <td className="border-b border-crema-claro py-2.5 text-right font-semibold">{l.valor}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex flex-wrap items-baseline justify-between gap-3 bg-trigo px-4 py-3.5">
        <div className="flex flex-col">
          <span className="font-bold text-vino">Total</span>
          <span className="text-[13px] text-cafe-medio">Pagado · {d.pago}</span>
        </div>
        <span className="text-[28px] font-bold text-vino tabular-nums">{d.cobro.totalTxt}</span>
      </div>

      <div className="flex flex-col gap-1 text-[13px] text-cafe-suave">
        <div>Registrado en contabilidad el {d.fechaLarga}.</div>
        <div>{NEGOCIO.nota}</div>
      </div>
    </article>
  )
}
