import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Alert } from '../../../../components/ui/Alert'
import { Button } from '../../../../components/ui/Button'
import { buttonClass } from '../../../../components/ui/buttonClass'
import { Icon } from '../../../../components/ui/Icon'
import { Loading } from '../../../../components/ui/Loading'
import { PageHeading } from '../../../../components/ui/PageHeading'
import { fecha } from '../../../../lib/format'
import { estaEntregado, yaEsta } from '../../etapas'
import { usePermisos } from '../../../admin/hooks/usePermisos'
import { useRegistros } from '../../hooks/useRegistros'
import { construirReporteLote } from '../../services/reportePdf'
import type { Registro } from '../../types'
import { calcularCobro, esEditable, registroACsv } from '../../utils'
import { AvisoRegistros } from '../AvisoRegistros'
import { CobroResumen } from './CobroResumen'
import { AlmacenamientoDetalle } from './AlmacenamientoDetalle'
import { DatosRegistro } from './DatosRegistro'
import { DescripcionesEtapas } from './DescripcionesEtapas'
import { EstadoEnvio } from './EstadoEnvio'
import { EtapaPanel } from './EtapaPanel'
import { CurvaTostion } from '../../../tostiones/components/CurvaTostion'

/** Descarga el reporte del lote en PDF. */
function descargarPdf(r: Registro) {
  const url = URL.createObjectURL(new Blob([construirReporteLote(r)], { type: 'application/pdf' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `${r.codigo}.pdf`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

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
  const { puede } = usePermisos()
  const r = registros.find((x) => x.id === id)
  const csvHref = useMemo(() => (r ? 'data:text/csv;charset=utf-8,' + encodeURIComponent(registroACsv(r)) : '#'), [r])

  if (cargando) return <Loading />
  if (!r) return <main className="p-6"><Alert kind="error">No se encontró el lote.</Alert></main>

  return (
    <main className="mx-auto flex w-full max-w-[880px] flex-1 flex-col gap-5 px-4 pb-12 pt-6">
      <PageHeading title={r.cliente} hideTitleOnMobile={false} back={{ to: '/', label: 'Registros' }}
        subtitle={`Lote ${r.codigo} · ${fecha(r.fecha, true)}`} />
      {aviso && <AvisoRegistros />}
      {r.reabiertoAt && r.estado !== 'Enviado' && (
        <Alert kind="neutral">Reabierto el {fecha(r.reabiertoAt.slice(0, 10), true)}. Ya estaba en contabilidad: después de modificarlo, envíalo otra vez.</Alert>
      )}
      <EtapaPanel r={r} />
      <DescripcionesEtapas key={r.id} r={r} />
      {yaEsta(r, 'Tostado') && <CurvaTostion r={r} />}
      {estaEntregado(r) && <EstadoEnvio r={r} />}
      {estaEntregado(r) && <AlmacenamientoDetalle r={r} />}
      {/* El cobro sale del café a tostar, que se anota al tostar. */}
      {yaEsta(r, 'Tostado') && <CobroResumen c={calcularCobro(r, r.precios)} pago={r.pago ?? 'Sin dato'} />}
      <DatosRegistro r={r} />
      <div className="flex flex-wrap gap-2">
        {esEditable(r) && puede('nuevo_lote') && (
          <Link to={`/registros/${r.id}/editar`} className={buttonClass('outline', 'lg', 'flex-1')}>
            <Icon name="editar" size={20} />
            Editar
          </Link>
        )}
        <a href={csvHref} download={`${r.codigo}.csv`} className={buttonClass('outline', 'lg', 'flex-1')}>
          <Icon name="descargar" size={20} />
          Exportar Excel/CSV
        </a>
        <Button variant="outline" size="lg" onClick={() => descargarPdf(r)} className="flex-1">
          <Icon name="descargar" size={20} />
          Exportar PDF
        </Button>
        {esEditable(r) && puede('nuevo_lote') && <Eliminar r={r} />}
      </div>
    </main>
  )
}
