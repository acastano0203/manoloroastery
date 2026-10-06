import { useResumenHoy } from '../hooks/useResumenHoy'

/** Resumen del día al pie del menú lateral. */
export function HoyTarjetaLateral() {
  const hoy = useResumenHoy()
  return (
    <div className="mt-auto flex flex-col gap-1 rounded-xl border border-arena bg-crema-claro p-3.5">
      <span className="text-[13px] font-semibold text-cafe-suave">Hoy · {hoy.fecha}</span>
      <span className="text-xl font-bold tabular-nums">{hoy.libras}</span>
      <span className="text-[13px] text-cafe-suave">{hoy.count} registros</span>
    </div>
  )
}
