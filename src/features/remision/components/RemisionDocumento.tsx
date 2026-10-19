import { NEGOCIO } from '../negocio'
import type { DatosRemision } from '../types'

/** Vista en pantalla del PDF de la remisión. */
export function RemisionDocumento({ d }: { d: DatosRemision }) {
  return (
    <article className="flex flex-col gap-[22px] rounded border border-linea bg-white px-5 py-7 shadow-[0_2px_12px_rgba(18,38,32,0.08)] sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-esmeralda pb-[18px]">
        <div className="flex flex-col gap-0.5">
          <div className="text-[19px] font-bold text-esmeralda-oscuro">{NEGOCIO.nombre}</div>
          <div className="text-[13px] text-pizarra-suave">NIT {NEGOCIO.nit} · {NEGOCIO.ciudad}</div>
          <div className="text-[13px] text-pizarra-suave">{NEGOCIO.celular}</div>
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <div className="text-xs font-bold tracking-[0.06em] text-pizarra-suave">REMISIÓN</div>
          <div className="text-[21px] font-bold tabular-nums">{d.codigo}</div>
          <div className="text-[13px] text-pizarra-suave">{d.fechaLarga}</div>
        </div>
      </div>

      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-bold tracking-[0.04em] text-pizarra-suave">CLIENTE</dt>
          <dd className="text-base font-bold">{d.cliente}</dd>
          <dd className="text-sm text-pizarra">{d.celularTxt}</dd>
        </div>
        <div>
          <dt className="text-xs font-bold tracking-[0.04em] text-pizarra-suave">CAFÉ RECIBIDO</dt>
          <dd className="text-base font-bold">{d.proceso} · {d.kilosTxt}</dd>
          <dd className="text-sm text-pizarra">Tostado: {d.gramosTxt}</dd>
        </div>
      </dl>

      <table className="w-full border-collapse text-left tabular-nums">
        <thead>
          <tr className="text-xs text-pizarra-suave">
            <th className="border-b border-linea pb-2 font-semibold">Concepto</th>
            <th className="border-b border-linea pb-2 text-right font-semibold">Valor</th>
          </tr>
        </thead>
        <tbody>
          {d.lineas.map((l) => (
            <tr key={l.concepto}>
              <td className="border-b border-rocio-claro py-2.5">
                <div className="text-[15px] font-semibold">{l.concepto}</div>
                <div className="text-[13px] text-pizarra-suave">{l.detalle}</div>
              </td>
              <td className="border-b border-rocio-claro py-2.5 text-right font-semibold">{l.valor}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex flex-wrap items-baseline justify-between gap-3 bg-esmeralda/15 px-4 py-3.5">
        <div className="flex flex-col">
          <span className="font-bold text-esmeralda-oscuro">Total</span>
          <span className="text-[13px] text-pizarra">Pagado · {d.pago}</span>
        </div>
        <span className="text-[28px] font-bold text-esmeralda-oscuro tabular-nums">{d.cobro.totalTxt}</span>
      </div>

      <div className="flex flex-col gap-1 text-[13px] text-pizarra-suave">
        <div>Registrado en contabilidad el {d.fechaLarga}.</div>
        <div>{NEGOCIO.nota}</div>
      </div>
    </article>
  )
}
