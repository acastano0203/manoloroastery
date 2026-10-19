import { useEffect, useState } from 'react'
import { Card } from '../../../../components/ui/Card'
import { enlaceArchivo } from '../../../../lib/archivos'
import { fecha, hoyISO, miles } from '../../../../lib/format'
import type { Registro } from '../../types'
import { almacenHasta, cantidadTxt } from '../../utils'

/** Café que quedó almacenado al entregar: días, hasta cuándo, cantidad, cómo va marcado y la foto. */
export function AlmacenamientoDetalle({ r }: { r: Registro }) {
  const a = r.almacenamiento
  const [foto, setFoto] = useState<string | null>(null)
  useEffect(() => {
    if (!a) return
    let vivo = true
    enlaceArchivo(a.foto).then((url) => { if (vivo) setFoto(url) }).catch(() => undefined)
    return () => { vivo = false }
  }, [a])
  if (!a) return null

  const hasta = almacenHasta(r)
  const vencido = hasta !== null && hasta < hoyISO()

  return (
    <Card title="Almacenamiento">
      <div className="flex flex-col gap-4 sm:flex-row">
        <dl className="m-0 grid flex-1 grid-cols-2 gap-3 tabular-nums">
          <div>
            <dt className="text-sm text-pizarra-suave">Días</dt>
            <dd className="m-0 font-semibold">{a.dias} {a.dias === 1 ? 'día' : 'días'}</dd>
          </div>
          <div>
            <dt className="text-sm text-pizarra-suave">Hasta</dt>
            <dd className={vencido ? 'm-0 font-semibold text-peligro' : 'm-0 font-semibold'}>
              {hasta ? fecha(hasta, true) : '—'}{vencido && ' · venció'}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-pizarra-suave">Cantidad</dt>
            <dd className="m-0 font-semibold">{cantidadTxt(a.gramos, a.unidad)}{a.unidad !== 'g' && <span className="font-normal text-pizarra-suave"> ({miles(a.gramos)} g)</span>}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-sm text-pizarra-suave">Cómo va marcado</dt>
            <dd className="m-0 font-semibold [overflow-wrap:anywhere]">{a.marcado}</dd>
          </div>
        </dl>
        {foto ? (
          <a href={foto} target="_blank" rel="noreferrer" className="shrink-0 self-start">
            <img src={foto} alt="Foto del café almacenado" className="max-h-48 w-auto rounded-lg border border-linea object-contain" />
          </a>
        ) : <span className="text-sm text-pizarra-suave">Cargando foto…</span>}
      </div>
    </Card>
  )
}
