import { Card } from '../../../../components/ui/Card'
import type { Cobro } from '../../types'

function Dato({ label, valor, formula }: { label: string; valor: string; formula: string }) {
  return (
    <div>
      <dt className="text-sm text-pizarra-suave">{label}</dt>
      <dd className="font-display text-xl font-bold">{valor}</dd>
      <dd className="text-[13px] text-pizarra-suave">{formula}</dd>
    </div>
  )
}

export function CobroResumen({ c, pago }: { c: Cobro; pago: string }) {
  return (
    <Card title="Cobro">
      <dl className="grid grid-cols-1 gap-4 tabular-nums sm:grid-cols-3">
        <Dato label="Libras" valor={c.librasTxt} formula={c.fLibras} />
        <Dato label="Tostión" valor={c.tostionTxt} formula={c.fTostion} />
        <Dato label="Bolsas y drips" valor={c.bolsasTxt} formula={c.fBolsas} />
      </dl>
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-t border-linea pt-3.5">
        <div className="font-semibold">Total cobrado · {pago}</div>
        <div className="text-[32px] font-bold text-esmeralda-oscuro tabular-nums">{c.totalTxt}</div>
      </div>
    </Card>
  )
}
