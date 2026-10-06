import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Alert } from '../../../../components/ui/Alert'
import { buttonClass } from '../../../../components/ui/buttonClass'
import { Icon } from '../../../../components/ui/Icon'
import { Loading } from '../../../../components/ui/Loading'
import { PageHeading } from '../../../../components/ui/PageHeading'
import { fecha } from '../../../../lib/format'
import { useRegistros } from '../../hooks/useRegistros'
import { calcularCobro, esEditable, registroACsv } from '../../utils'
import { AvisoRegistros } from '../AvisoRegistros'
import { CobroResumen } from './CobroResumen'
import { DatosRegistro } from './DatosRegistro'
import { EstadoEnvio } from './EstadoEnvio'

export function RegistroDetalle({ id }: { id: string }) {
  const { registros, cargando, aviso } = useRegistros()
  const r = registros.find((x) => x.id === id)
  const csvHref = useMemo(() => (r ? 'data:text/csv;charset=utf-8,' + encodeURIComponent(registroACsv(r)) : '#'), [r])

  if (cargando) return <Loading />
  if (!r) return <main className="p-6"><Alert kind="error">No se encontró el registro.</Alert></main>

  return (
    <main className="mx-auto flex w-full max-w-[880px] flex-1 flex-col gap-5 px-4 pb-12 pt-6">
      <PageHeading title={r.cliente} hideTitleOnMobile={false} back={{ to: '/', label: 'Registros' }}
        subtitle={`Registro ${r.codigo} · ${fecha(r.fecha, true)}`} />
      {aviso?.kind === 'error' && <AvisoRegistros />}
      <EstadoEnvio r={r} />
      <CobroResumen c={calcularCobro(r, r.precios)} pago={r.pago} />
      <DatosRegistro r={r} />
      <div className="flex flex-wrap gap-2">
        {esEditable(r) && (
          <Link to={`/registros/${r.id}/editar`} className={buttonClass('outline', 'lg', 'flex-1')}>
            <Icon name="editar" size={20} />
            Editar
          </Link>
        )}
        <a href={csvHref} download={`${r.codigo}.csv`} className={buttonClass('outline', 'lg', 'flex-1')}>
          <Icon name="descargar" size={20} />
          Exportar Excel/CSV
        </a>
      </div>
    </main>
  )
}
