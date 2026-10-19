import { Alert } from '../../../components/ui/Alert'
import { buttonClass } from '../../../components/ui/buttonClass'
import { Icon } from '../../../components/ui/Icon'
import { Loading } from '../../../components/ui/Loading'
import { PageHeading } from '../../../components/ui/PageHeading'
import { Link } from 'react-router-dom'
import { estaEntregado } from '../../registros/etapas'
import { useRegistros } from '../../registros/hooks/useRegistros'
import type { Registro } from '../../registros/types'
import { useRemision } from '../hooks/useRemision'
import { CompartirAcciones } from './CompartirAcciones'
import { RemisionDocumento } from './RemisionDocumento'
import { WhatsAppVistaPrevia } from './WhatsAppVistaPrevia'

function Remision({ r }: { r: Registro }) {
  const rem = useRemision(r)
  const { datos } = rem
  return (
    <main className="mx-auto flex w-full max-w-[1080px] flex-1 flex-col gap-4 px-3 pb-32 pt-6 md:pb-8">
      <PageHeading title={`Remisión ${r.codigo}`} back={{ to: `/registros/${r.id}`, label: 'Detalle del lote' }} />
      <div className="flex flex-wrap items-start gap-6">
        <section aria-label="PDF de la remisión" className="flex min-w-0 flex-[1_1_420px] flex-col gap-2.5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="m-0 min-w-0 text-base font-bold [overflow-wrap:anywhere]">PDF · {rem.pdfName}</h2>
            <a href={rem.pdfHref} download={rem.pdfName} className={buttonClass('outline', 'sm', 'shrink-0')}>
              <Icon name="descargar" size={18} />
              Descargar
            </a>
          </div>
          <RemisionDocumento d={datos} />
        </section>

        <section aria-labelledby="t-wa" className="flex min-w-0 flex-[1_1_320px] flex-col gap-3">
          <h2 id="t-wa" className="m-0 text-base font-bold">Así le llega por WhatsApp</h2>
          <WhatsAppVistaPrevia pdfName={rem.pdfName} texto={rem.texto} celularTxt={datos.celularTxt} />
          <CompartirAcciones rem={rem} celularTxt={datos.celularTxt} />
          {rem.aviso && <Alert kind="ok">{rem.aviso}</Alert>}
          {rem.fallback && (
            <div role="status" className="flex flex-col gap-2.5 rounded-xl border-2 border-verde-salvia bg-white p-4">
              <div className="font-bold">PDF descargado: {rem.pdfName}</div>
              <div className="text-[15px] text-pizarra">
                En el chat del cliente toca el ícono de adjuntar, elige Documento y selecciona el PDF. El texto ya queda escrito.
              </div>
              <a href={rem.waUrl} target="_blank" rel="noopener" className={buttonClass('secondary', 'lg')}>
                <Icon name="whatsapp" size={20} />
                ¿No se abrió WhatsApp? Ábrelo aquí
              </a>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

export function RemisionVista({ id }: { id: string }) {
  const { registros, cargando } = useRegistros()
  const r = registros.find((x) => x.id === id)
  if (cargando) return <Loading />
  if (!r) return <main className="p-6"><Alert kind="error">No se encontró el lote.</Alert></main>
  if (!estaEntregado(r) || r.estado !== 'Enviado') {
    return (
      <main className="mx-auto flex w-full max-w-[720px] flex-col gap-4 p-6">
        <Alert kind="neutral">La remisión se comparte cuando el lote está entregado y enviado a contabilidad.</Alert>
        <Link to={`/registros/${r.id}`} className={buttonClass('primary', 'xl', 'font-bold')}>Ver el lote</Link>
      </main>
    )
  }
  return <Remision r={r} />
}
