import { Link } from 'react-router-dom'
import { Button } from '../../../../components/ui/Button'
import { buttonClass } from '../../../../components/ui/buttonClass'
import { Icon } from '../../../../components/ui/Icon'
import { cx } from '../../../../lib/cx'
import { useRegistros } from '../../hooks/useRegistros'
import type { Estado, Registro } from '../../types'

const cajas: Record<Estado, { caja: string; punto: string; titulo: string }> = {
  Error: { caja: 'bg-red-50 border-red-200 text-red-900', punto: 'bg-peligro', titulo: 'Error al enviar' },
  Enviando: { caja: 'bg-crema border-dorado text-cafe', punto: 'bg-cafe-suave', titulo: 'Enviando…' },
  Pendiente: { caja: 'bg-amber-50 border-amber-200 text-amber-900', punto: 'bg-amber-600', titulo: 'Pendiente de enviar' },
  Enviado: { caja: 'bg-green-50 border-green-200 text-green-900', punto: 'bg-green-700', titulo: 'Enviado · Remisión lista' },
}

function texto(r: Registro) {
  if (r.estado === 'Error') {
    return r.factura && !r.numDoc
      ? 'Falta el número de documento para la factura. Edita el registro y reenvía.'
      : 'No se pudo enviar. Intenta de nuevo.'
  }
  if (r.estado === 'Enviando') return 'Esperando respuesta.'
  if (r.estado === 'Pendiente') return 'Este registro aún no se ha enviado.'
  return 'Ya puedes compartir la remisión con el cliente.'
}

export function EstadoEnvio({ r }: { r: Registro }) {
  const { enviar } = useRegistros()
  const caja = cajas[r.estado]
  return (
    <section aria-label="Estado de envío" className={cx('flex flex-wrap items-center gap-4 rounded-[14px] border px-5 py-[18px]', caja.caja)}>
      <div className="flex min-w-[220px] flex-1 items-start gap-3">
        <span className={cx('mt-1.5 h-3 w-3 shrink-0 rounded-full', caja.punto)} />
        <div className="flex flex-col gap-0.5">
          <div className="text-[17px] font-bold">{caja.titulo}</div>
          <div className="text-[15px]">{texto(r)}</div>
        </div>
      </div>
      {r.estado !== 'Enviado' && (
        <Button size="lg" onClick={() => void enviar(r.id)} disabled={r.estado === 'Enviando'} className="w-full font-bold sm:w-auto">
          <Icon name="enviar" size={20} />
          {r.estado === 'Enviando' ? 'Enviando…' : r.estado === 'Error' ? 'Reenviar' : 'Enviar'}
        </Button>
      )}
      {r.estado === 'Enviado' && (
        <Link to={`/registros/${r.id}/remision`} className={buttonClass('primary', 'lg', 'w-full font-bold sm:w-auto')}>
          <Icon name="compartir" size={20} />
          Compartir remisión
        </Link>
      )}
    </section>
  )
}
