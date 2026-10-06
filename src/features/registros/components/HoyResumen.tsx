import { useResumenHoy } from '../hooks/useResumenHoy'

function Dato({ label, valor, grande }: { label: string; valor: string; grande?: boolean }) {
  return (
    <div className="rounded-xl border border-arena bg-white p-4">
      <div className="text-sm font-medium text-cafe-suave">{label}</div>
      <div className={grande ? 'mt-1 text-[28px] font-bold tabular-nums' : 'mt-1 text-2xl font-bold tabular-nums'}>{valor}</div>
    </div>
  )
}

export function HoyResumen() {
  const hoy = useResumenHoy()
  return (
    <section aria-label="Totales del día" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="m-0 text-lg font-bold">Hoy · {hoy.fecha}</h2>
        <div className="text-[15px] text-cafe-suave">{hoy.count} {hoy.count === 1 ? 'lote' : 'lotes'}</div>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Dato label="Libras tostadas" valor={hoy.libras} grande />
        <Dato label="Efectivo" valor={hoy.efectivo} />
        <Dato label="Banco" valor={hoy.banco} />
        <Dato label="Bold" valor={hoy.bold} />
      </div>
    </section>
  )
}
