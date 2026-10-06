import { Card } from '../../../../components/ui/Card'
import { cel, dec, kg } from '../../../../lib/format'
import type { Registro } from '../../types'
import { describirBolsas } from '../../utils'

function Dato({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <dt className="text-sm text-cafe-suave">{label}</dt>
      <dd className="font-semibold">{valor}</dd>
    </div>
  )
}

/** Tarjetas "Cliente y factura" y "Café y empaque". */
export function DatosRegistro({ r }: { r: Registro }) {
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
      <Card title="Cliente y factura">
        <dl className="flex flex-col gap-3">
          <Dato label="Cliente" valor={r.cliente} />
          <Dato label="Celular (remisión)" valor={cel(r.celular)} />
          <Dato label="Factura electrónica" valor={r.factura ? 'Sí' : 'No'} />
          {r.factura && (
            <>
              <Dato label="Documento" valor={`${r.tipoDoc} ${r.numDoc || '— falta —'}`} />
              <Dato label="Correo" valor={r.correo || '— falta —'} />
            </>
          )}
        </dl>
      </Card>
      <Card title="Café y empaque">
        <dl className="flex flex-col gap-3 tabular-nums">
          <Dato label="Proceso" valor={r.proceso} />
          <Dato label="Kilos recibidos" valor={`${kg(r.kilos)} kg`} />
          <Dato label="Café a tostar" valor={`${dec(r.gramos, 0)} g`} />
          <Dato label="Bolsas" valor={describirBolsas(r)} />
          <Dato label="Forma de pago" valor={r.pago} />
        </dl>
      </Card>
    </div>
  )
}
