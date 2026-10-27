import { Link } from 'react-router-dom'
import { Icon } from '../../../components/ui/Icon'
import { usePermisos } from '../../admin/hooks/usePermisos'
import { useConfig } from '../hooks/useConfig'
import { alertasInventario, quedanTxt } from '../inventario'
import { ALERTA_INVENTARIO } from '../types'

/** Aviso en el tablero cuando alguna bolsa o los drips se están acabando (50 o menos) o se acabaron. */
export function AvisoInventario() {
  const { config } = useConfig()
  const { puede } = usePermisos()
  const alertas = alertasInventario(config?.inventario)
  if (!alertas.length) return null
  const agotado = alertas.some((a) => a.nivel === 'agotado')
  return (
    <div role="status" className={agotado
      ? 'flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[15px] text-red-900'
      : 'flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-[15px] text-amber-900'}>
      <Icon name="aviso" size={20} />
      <span className="min-w-0 flex-1">
        <strong>{agotado ? 'Se acabaron bolsas o drips' : `Quedan ${ALERTA_INVENTARIO} o menos`}:</strong>{' '}
        {alertas.map((a) => `${a.nombre} (${quedanTxt(a.quedan).toLowerCase()})`).join(' · ')}
      </span>
      {puede('configuracion') && (
        <Link to="/configuracion" className="font-semibold text-esmeralda-oscuro">Actualizar inventario</Link>
      )}
    </div>
  )
}
