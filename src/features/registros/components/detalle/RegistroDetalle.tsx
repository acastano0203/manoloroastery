import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Alert } from '../../../../components/ui/Alert'
import { Button } from '../../../../components/ui/Button'
import { buttonClass } from '../../../../components/ui/buttonClass'
import { Icon } from '../../../../components/ui/Icon'
import { Loading } from '../../../../components/ui/Loading'
import { PageHeading } from '../../../../components/ui/PageHeading'
import { fecha } from '../../../../lib/format'
import { estaEntregado } from '../../etapas'
import { useRegistros } from '../../hooks/useRegistros'
import type { Registro } from '../../types'
import { calcularCobro, esEditable, registroACsv } from '../../utils'
import { AvisoRegistros } from '../AvisoRegistros'
import { CobroResumen } from './CobroResumen'
import { DatosRegistro } from './DatosRegistro'
import { EstadoEnvio } from './EstadoEnvio'
import { EtapaPanel } from './EtapaPanel'

function Eliminar({ r }: { r: Registro }) {
  const { eliminar } = useRegistros()
  const navigate = useNavigate()
  const [confirmando, setConfirmando] = useState(false)

  if (!confirmando) {
    return (
      <Button variant="dangerOutline" size="lg" onClick={() => setConfirmando(true)} className="flex-1">
        <Icon name="eliminar" size={20} />
        Eliminar lote
      </Button>
    )
  }
  return (
    <div className="flex w-full flex-col gap-2 rounded-[10px] bg-red-50 p-3">
      <span className="text-[15px] font-semibold text-red-800">¿Eliminar este lote? No se puede deshacer.</span>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" size="lg" onClick={() => setConfirmando(false)}>No</Button>
        <Button variant="danger" size="lg" onClick={() => { navigate('/'); void eliminar(r) }}>Sí, eliminar</Button>
      </div>
    </div>
  )
}

export function RegistroDetalle({ id }: { id: string }) {
  const { registros, cargando, aviso } = useRegistros()
  const r = registros.find((x) => x.id === id)
  const csvHref = useMemo(() => (r ? 'data:text/csv;charset=utf-8,' + encodeURIComponent(registroACsv(r)) : '#'), [r])

  if (cargando) return <Loading />
  if (!r) return <main className="p-6"><Alert kind="error">No se encontró el lote.</Alert></main>

  return (
    <main className="mx-auto flex w-full max-w-[880px] flex-1 flex-col gap-5 px-4 pb-12 pt-6">
      <PageHeading title={r.cliente} hideTitleOnMobile={false} back={{ to: '/', label: 'Registros' }}
        subtitle={`Lote ${r.codigo} · ${fecha(r.fecha, true)}`} />
      {aviso && <AvisoRegistros />}
      <EtapaPanel r={r} />
      {estaEntregado(r) && <EstadoEnvio r={r} />}
      <CobroResumen c={calcularCobro(r, r.precios)} pago={r.pago ?? 'Sin dato'} />
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
        {esEditable(r) && <Eliminar r={r} />}
      </div>
    </main>
  )
}
