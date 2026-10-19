import { useResumenHoy } from '../hooks/useResumenHoy'

/** Resumen del día al pie del menú lateral. */
export function HoyTarjetaLateral() {
  const hoy = useResumenHoy()
  return (
    <div className="mt-auto flex flex-col gap-1 rounded-xl border border-linea bg-rocio-claro p-3.5">
      <span className="text-[13px] font-semibold text-pizarra-suave">Hoy · {hoy.fecha}</span>
      <span className="font-display text-xl font-bold tabular-nums">{hoy.libras}</span>
      <span className="text-[13px] text-pizarra-suave">{hoy.count} registros</span>
    </div>
  )
}
