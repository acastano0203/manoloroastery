import { Chip } from '../../../components/ui/Chip'
import { SearchInput } from '../../../components/ui/SearchInput'
import { RANGOS, useHistorial } from '../hooks/useHistorial'
import { HistorialLista } from './HistorialLista'

export function Historial() {
  const h = useHistorial()
  return (
    <section aria-labelledby="t-hist" className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <h2 id="t-hist" className="m-0 text-xl font-bold">Historial</h2>
        <p className="m-0 text-[15px] text-cafe-suave">Ya enviados. Solo lectura; la remisión se comparte con el cliente.</p>
      </div>
      <SearchInput value={h.q} onChange={h.setQ} placeholder="Buscar cliente" ariaLabel="Buscar por nombre de cliente" />
      <div role="group" aria-label="Fecha" className="flex flex-wrap gap-1.5">
        {RANGOS.map(([id, label]) => (
          <Chip key={id} on={h.rango === id} onClick={() => h.setRango(id)}>{label}</Chip>
        ))}
      </div>
      <HistorialLista lista={h.lista} vacioTxt={h.vacioTxt} />
    </section>
  )
}
