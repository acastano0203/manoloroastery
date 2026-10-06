import { Button } from '../../../../components/ui/Button'
import type { RegistroFormApi } from '../../hooks/useRegistroForm'

function Dato({ label, valor, formula }: { label: string; valor: string; formula: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-sm font-medium text-cafe-suave">{label}</span>
      <span className="text-[22px] font-bold tabular-nums">{valor}</span>
      <span className="text-[13px] text-cafe-suave">{formula}</span>
    </div>
  )
}

/** Barra fija abajo con el total a cobrar y los botones de guardar. */
export function ResumenCobroBar({ f }: { f: RegistroFormApi }) {
  const { cobro: c, formMsg, guardando, guardar, guardarTxt } = f
  const botones = (
    <Button size="xl" onClick={() => void guardar()} disabled={guardando} className="flex-1 font-bold">
      {guardando ? 'Guardando…' : guardarTxt}
    </Button>
  )
  const mensaje = formMsg && (
    <div role="status" className="rounded-lg bg-red-100 px-3 py-1.5 text-center text-[15px] font-semibold text-red-800">{formMsg}</div>
  )

  return (
    <div className="sticky bottom-0 z-10 border-t border-dorado bg-white shadow-[0_-6px_20px_rgba(28,25,23,0.06)]">
      {/* celular */}
      <div className="flex flex-col gap-2.5 px-4 pb-4 pt-3 lg:hidden">
        <div className="flex items-end justify-between gap-3">
          <div className="flex flex-col">
            <span className="text-[13px] font-semibold text-cafe-suave">Total a cobrar</span>
            <span className="text-[30px] font-bold leading-[1.1] text-vino tabular-nums">{c?.totalTxt ?? '—'}</span>
          </div>
          <div className="text-right text-sm text-cafe-medio tabular-nums">
            <div>{c?.librasTxt} · {c?.tostionTxt}</div>
            <div>Bolsas {c?.bolsasTxt}</div>
          </div>
        </div>
        <div className="text-[13px] text-cafe-suave">{c?.fTotal}</div>
        {mensaje}
        <div className="flex gap-2">{botones}</div>
      </div>

      {/* escritorio */}
      <div className="mx-auto hidden max-w-[1200px] items-center gap-8 px-8 py-4 lg:flex">
        <div className="flex flex-1 items-end gap-8">
          <Dato label="Libras" valor={c?.librasTxt ?? '—'} formula={c?.fLibras ?? ''} />
          <Dato label="Tostión" valor={c?.tostionTxt ?? '—'} formula={c?.fTostion ?? ''} />
          <Dato label="Bolsas" valor={c?.bolsasTxt ?? '—'} formula={c?.fBolsas ?? ''} />
          <div className="flex flex-col border-l border-arena pl-8">
            <span className="text-sm font-semibold text-cafe-suave">Total a cobrar</span>
            <span className="text-4xl font-bold leading-[1.1] text-vino tabular-nums">{c?.totalTxt ?? '—'}</span>
            <span className="text-[13px] text-cafe-suave">{c?.fTotal}</span>
          </div>
        </div>
        <div className="flex min-w-[300px] flex-col gap-2">
          <div className="flex gap-2">{botones}</div>
          {mensaje}
        </div>
      </div>
    </div>
  )
}
