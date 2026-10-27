import { Card } from '../../../../components/ui/Card'
import { cel, dec, kg, kgDeG, miles } from '../../../../lib/format'
import type { Registro } from '../../types'
import { cx } from '../../../../lib/cx'
import { calcularMerma, calcularPerdidaTueste, capaTrilla, describirBolsas, mermaAlta, mermaMaxima } from '../../utils'

function Dato({ label, valor, alerta }: { label: string; valor: string; alerta?: string }) {
  return (
    <div>
      <dt className="text-sm text-pizarra-suave">{label}</dt>
      <dd className={cx('font-semibold', alerta && 'text-peligro')}>{valor}</dd>
      {alerta && <dd className="mt-1 rounded-lg bg-red-50 px-3 py-2 text-[15px] font-medium text-red-800">{alerta}</dd>}
    </div>
  )
}

/** Tarjetas "Cliente y factura" y "Café y empaque". */
export function DatosRegistro({ r }: { r: Registro }) {
  const merma = calcularMerma(r)
  const perdida = calcularPerdidaTueste(r)
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
          {r.humedad !== null && <Dato label="Humedad" valor={`${kg(r.humedad)} %`} />}
          {r.densidad !== null && <Dato label="Densidad del grano" valor={`${kg(r.densidad)} g/L`} />}
          {r.gramos !== null && <Dato label="Peso en almendra (café a tostar)" valor={`${kgDeG(r.gramos)} kg`} />}
          {merma !== null && (
            <Dato label={`Merma (sin ${capaTrilla(r.proceso)})`} valor={`${dec(merma, 1)} %`}
              alerta={mermaAlta(merma, r.proceso) ? `Supera el ${mermaMaxima(r.proceso)} %. Coméntaselo al productor.` : undefined} />
          )}
          {r.gramosTostado !== null && <Dato label="Peso del café tostado" valor={`${kgDeG(r.gramosTostado)} kg`} />}
          {perdida !== null && <Dato label="Pérdida en el tueste" valor={`${dec(perdida, 1)} %`} />}
          {r.presentacion && <Dato label="Presentación" valor={r.presentacion === 'Molido' ? `Molido${r.molienda ? ` · ${r.molienda}` : ''}` : 'En grano'} />}
          {r.gramosSobrante ? <Dato label="Sobrante sin empacar (se entrega suelto)" valor={`${miles(r.gramosSobrante)} g`} /> : null}
          <Dato label="Bolsas y drips" valor={describirBolsas(r)} />
          <Dato label="Forma de pago" valor={r.pago ?? 'Sin dato'} />
        </dl>
      </Card>
    </div>
  )
}
