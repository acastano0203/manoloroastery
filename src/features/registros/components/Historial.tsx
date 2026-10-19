import { Chip } from '../../../components/ui/Chip'
import { Paginacion } from '../../../components/ui/Paginacion'
import { SearchInput } from '../../../components/ui/SearchInput'
import { dec, money } from '../../../lib/format'
import { RANGOS } from '../historial'
import { useHistorial } from '../hooks/useHistorial'
import { HistorialLista } from './HistorialLista'

export function Historial() {
  const h = useHistorial()
  const { lotes, libras, total } = h.resumen
  return (
    <section aria-labelledby="t-hist" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <div className="flex flex-col gap-0.5">
          <h2 id="t-hist" className="m-0 text-xl font-bold">Historial</h2>
          <p className="m-0 text-[15px] text-pizarra-suave">Entregados y enviados a contabilidad. Aquí se comparte la remisión o se reabre un lote.</p>
        </div>
        {lotes > 0 && (
          <p className="m-0 text-[15px] text-pizarra tabular-nums" aria-live="polite">
            <strong>{lotes}</strong> {lotes === 1 ? 'lote' : 'lotes'} · <strong>{dec(libras, 2)} lb</strong> · <strong>{money(total)}</strong>
          </p>
        )}
      </div>
      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <div className="md:w-[360px]">
          <SearchInput value={h.q} onChange={h.setQ} placeholder="Buscar cliente o lote (L-0007)" ariaLabel="Buscar por cliente o código de lote" />
        </div>
        <div role="group" aria-label="Fecha" className="flex flex-wrap gap-1.5">
          {RANGOS.map(([id, label]) => (
            <Chip key={id} on={h.rango === id} onClick={() => h.setRango(id)}>{label}</Chip>
          ))}
        </div>
      </div>
      <HistorialLista grupos={h.grupos} vacioTxt={h.vacioTxt} />
      <Paginacion pagina={h.pag.pagina} paginas={h.pag.paginas} desde={h.pag.desde} hasta={h.pag.hasta} total={lotes}
        nombre={['lote', 'lotes']} onCambiar={(p) => { h.setPagina(p); document.getElementById('t-hist')?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }} />
    </section>
  )
}
