import { Button } from '../../../components/ui/Button'
import { Icon } from '../../../components/ui/Icon'
import { fecha } from '../../../lib/format'
import { useAccionesRegistro } from '../hooks/useAccionesRegistro'
import type { Registro } from '../types'
import { calcularCobro } from '../utils'
import { EstadoBadge } from './EstadoBadge'

/** Fila de "Registros creados" en la tabla de escritorio. */
export function CreadoFila({ r }: { r: Registro }) {
  const a = useAccionesRegistro(r)
  const c = calcularCobro(r, r.precios)
  return (
    <tr className="border-t border-arena">
      <td className="px-5 py-3 text-cafe-medio">{fecha(r.fecha)}</td>
      <td className="px-5 py-3">
        <button type="button" onClick={a.abrir} className="min-h-11 text-left font-semibold underline decoration-dorado underline-offset-[3px]">
          {r.cliente}
        </button>
      </td>
      <td className="px-5 py-3 text-right">{c.librasTxt}</td>
      <td className="px-5 py-3 text-right font-semibold">{c.totalTxt}</td>
      <td className="px-5 py-3 text-cafe-medio">{r.pago}</td>
      <td className="px-5 py-3"><EstadoBadge estado={r.estado} /></td>
      <td className="px-5 py-3">
        {a.confirmando ? (
          <div className="flex items-center justify-end gap-1.5">
            <span className="text-[15px] font-semibold text-red-800">¿Eliminar?</span>
            <Button variant="danger" size="sm" onClick={a.eliminar}>Sí, eliminar</Button>
            <Button variant="outline" size="sm" onClick={a.cancelar}>No</Button>
          </div>
        ) : (
          <div className="flex justify-end gap-1.5">
            <Button variant="outline" size="sm" onClick={a.editar} disabled={a.enviando}>
              <Icon name="editar" size={18} />
              Editar
            </Button>
            <Button size="sm" onClick={a.enviar} disabled={a.enviando} className="min-w-[104px]">{a.enviarTxt}</Button>
            <Button variant="dangerOutline" size="sm" onClick={a.pedirEliminar} disabled={a.enviando}
              aria-label={`Eliminar registro de ${r.cliente}`} className="w-11 !px-0">
              <Icon name="eliminar" size={18} />
            </Button>
          </div>
        )}
      </td>
    </tr>
  )
}
