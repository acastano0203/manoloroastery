import { Card } from '../../../../components/ui/Card'
import { dec, fecha, kg, kgDeG } from '../../../../lib/format'
import { yaEsta } from '../../etapas'
import type { Registro } from '../../types'
import { calcularMerma, calcularPerdidaTueste, capaTrilla, describirBolsas } from '../../utils'

function Dato({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <dt className="text-sm text-pizarra-suave">{label}</dt>
      <dd className="m-0 font-semibold tabular-nums">{valor}</dd>
    </div>
  )
}

/** Datos de las etapas por las que ya pasó el lote: se ven pero no se editan. */
export function DatosAnteriores({ r }: { r: Registro }) {
  const merma = calcularMerma(r)
  const perdida = calcularPerdidaTueste(r)
  const pasoTostado = yaEsta(r, 'Empacado')
  const pasoEmpaque = yaEsta(r, 'Entregado')

  return (
    <Card title="Datos de etapas anteriores" className="bg-rocio-claro">
      <p className="m-0 -mt-1 text-[15px] text-pizarra-suave">
        No se cambian aquí. Para corregir uno, devuelve el lote a esa etapa con «Volver a…» en el detalle del lote.
      </p>
      <dl className="m-0 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Dato label="Fecha" valor={fecha(r.fecha, true)} />
        <Dato label="Proceso" valor={r.proceso} />
        <Dato label="Kilos recibidos" valor={`${kg(r.kilos)} kg`} />
        {r.humedad !== null && <Dato label="Humedad" valor={`${kg(r.humedad)} %`} />}
        {r.densidad !== null && <Dato label="Densidad del grano" valor={`${kg(r.densidad)} g/L`} />}
        {pasoTostado && r.gramos !== null && <Dato label="Peso en almendra" valor={`${kgDeG(r.gramos)} kg`} />}
        {pasoTostado && merma !== null && <Dato label={`Merma (sin ${capaTrilla(r.proceso)})`} valor={`${dec(merma, 1)} %`} />}
        {pasoEmpaque && r.gramosTostado !== null && <Dato label="Peso del café tostado" valor={`${kgDeG(r.gramosTostado)} kg`} />}
        {pasoEmpaque && perdida !== null && <Dato label="Pérdida en el tueste" valor={`${dec(perdida, 1)} %`} />}
        {r.etapa !== 'Empacado' && <Dato label="Bolsas y drips" valor={describirBolsas(r)} />}
      </dl>
    </Card>
  )
}
