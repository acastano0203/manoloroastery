import { Button } from '../../../components/ui/Button'
import { Icon } from '../../../components/ui/Icon'
import { fecha } from '../../../lib/format'
import { useAccionesRegistro } from '../hooks/useAccionesRegistro'
import type { Registro } from '../types'
import { calcularCobro } from '../utils'
import { EstadoBadge } from './EstadoBadge'

/** Tarjeta de "Registros creados" en celular. */
export function CreadoTarjeta({ r }: { r: Registro }) {
  const a = useAccionesRegistro(r)
  const c = calcularCobro(r, r.precios)
  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-arena bg-white p-4">
      <button type="button" onClick={a.abrir} className="flex w-full flex-col gap-1.5 text-left">
        <span className="flex w-full items-baseline justify-between gap-3">
          <span className="text-[17px] font-semibold">{r.cliente}</span>
          <span className="whitespace-nowrap text-[17px] font-bold tabular-nums">{c.totalTxt}</span>
        </span>
        <span className="flex w-full flex-wrap items-center justify-between gap-2">
          <span className="text-[15px] text-cafe-suave">{fecha(r.fecha)} · {c.librasTxt} · {r.pago}</span>
          <EstadoBadge estado={r.estado} />
        </span>
      </button>
      {a.confirmando ? (
        <div className="flex flex-col gap-2 rounded-[10px] bg-red-50 p-3">
          <span className="text-[15px] font-semibold text-red-800">¿Eliminar este registro? No se puede deshacer.</span>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={a.cancelar}>No</Button>
            <Button variant="danger" onClick={a.eliminar}>Sí, eliminar</Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-[1fr_1.3fr_52px] gap-2">
          <Button variant="outline" onClick={a.editar} disabled={a.enviando}>Editar</Button>
          <Button onClick={a.enviar} disabled={a.enviando}>{a.enviarTxt}</Button>
          <Button variant="dangerOutline" onClick={a.pedirEliminar} disabled={a.enviando}
            aria-label={`Eliminar registro de ${r.cliente}`} className="!px-0">
            <Icon name="eliminar" size={20} />
          </Button>
        </div>
      )}
    </div>
  )
}
