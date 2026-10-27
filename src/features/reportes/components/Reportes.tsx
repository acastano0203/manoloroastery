import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../../../components/ui/Button'
import { Chip } from '../../../components/ui/Chip'
import { Icon } from '../../../components/ui/Icon'
import { Loading } from '../../../components/ui/Loading'
import { PageHeading } from '../../../components/ui/PageHeading'
import { cx } from '../../../lib/cx'
import { dec, fecha, hoyISO, money } from '../../../lib/format'
import { usePermisos } from '../../admin/hooks/usePermisos'
import { useRegistros } from '../../registros/hooks/useRegistros'
import { SERIES } from '../colores'
import {
  atrasoPorTramo, duracion, fmtKg, fmtNum, inventarioPorEtapa, masAtrasados, pendiente, porPeriodo, porPresentacion, porProceso,
  RANGOS, rangoDe, rendimientoPorProceso, tiemposPorEtapa, topClientes, totales, type RangoId,
} from '../reportes'
import { construirReporte } from '../services/reportePdf'
import { BarrasH, BarrasV, Dona, Panel } from './Graficas'

const kgTxt = (v: number) => `${fmtKg(v)} kg`
const lotesTxt = (v: number) => `${v} ${v === 1 ? 'lote' : 'lotes'}`
const pctTxt = (v: number | null) => (v === null ? '—' : `${dec(v, 1)} %`)

/** Reportes de la tostaduría: qué hay en proceso, qué tan atrasados vamos y qué pasó en el período. */
export function Reportes() {
  const { registros, cargando } = useRegistros()
  const [rangoId, setRangoId] = useState<RangoId>('30')
  const [verTabla, setVerTabla] = useState(false)
  const { veLotes } = usePermisos()
  const hoy = hoyISO()

  const d = useMemo(() => {
    const rango = rangoDe(rangoId, registros, hoy)
    return {
      rango,
      totales: totales(registros, rango),
      pendiente: pendiente(registros, hoy),
      inventario: inventarioPorEtapa(registros),
      atraso: atrasoPorTramo(registros, hoy),
      atrasados: masAtrasados(registros, hoy),
      tiempos: tiemposPorEtapa(registros, rango),
      periodo: porPeriodo(registros, rango),
      procesos: porProceso(registros, rango),
      presentacion: porPresentacion(registros, rango),
      rendimiento: rendimientoPorProceso(registros, rango),
      clientes: topClientes(registros, rango),
    }
  }, [registros, rangoId, hoy])

  if (cargando) return <Loading />

  const nombreRango = RANGOS.find((r) => r.id === rangoId)!.nombre
  const { totales: t, pendiente: p } = d
  const periodos = d.periodo.periodos

  function descargarPdf() {
    const bytes = construirReporte({ ...d, hoy, nombreRango })
    const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `Reporte-${hoy}.pdf`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
  }

  return (
    <main className="mx-auto flex w-full max-w-[1280px] flex-1 flex-col gap-6 px-4 pb-12 pt-6 md:px-6">
      <PageHeading title="Reportes" hideTitleOnMobile={false}
        subtitle={`${nombreRango}: ${fecha(d.rango.desde, true)} a ${fecha(d.rango.hasta, true)}`}
        action={
          <Button variant="secondary" size="lg" onClick={descargarPdf}>
            <Icon name="descargar" size={20} />
            Exportar PDF
          </Button>
        } />

      {/* ---------- Hoy ---------- */}
      <h2 className="m-0 -mb-2 text-xl font-bold">Hoy en la tostaduría</h2>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi titulo="Falta por tostar" valor={kgTxt(p.kg)} detalle={`${lotesTxt(p.lotes)} · recibidos`} destacado />
        <Kpi titulo="Por trillar" valor={kgTxt(p.porTrillar.kg)} detalle={lotesTxt(p.porTrillar.lotes)} />
        <Kpi titulo="En almendra por tostar" valor={kgTxt(p.enAlmendra.kg)} detalle={`${lotesTxt(p.enAlmendra.lotes)} · trillados o verdes`} />
        <Kpi titulo="Tostado por empacar" valor={kgTxt(p.porEmpacar.kg)} detalle={`${lotesTxt(p.porEmpacar.lotes)} · en almendra`} />
        <Kpi titulo="Empacado por entregar" valor={kgTxt(p.porEntregar.kg)} detalle={`${lotesTxt(p.porEntregar.lotes)} · tostado`} />
      </div>
      {p.masViejoDias !== null && p.masViejoDias > 5 && (
        <p className="m-0 flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-[15px] text-amber-900">
          <Icon name="aviso" size={20} />
          El lote más viejo por tostar se recibió hace <strong>{p.masViejoDias} días</strong>.
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel titulo="Café en proceso por etapa" subtitulo="Kilos recibidos de los lotes que aún no se entregan">
          <Dona partes={d.inventario} unidad={kgTxt} total={kgTxt(d.inventario.reduce((s, x) => s + x.valor, 0))} />
        </Panel>
        <Panel titulo="¿Qué tan atrasados vamos?" subtitulo="Lotes sin entregar según los días desde que se recibieron">
          <BarrasH partes={d.atraso} unidad={lotesTxt} vacio="No hay lotes en proceso." />
        </Panel>
      </div>

      <Panel titulo="Lotes más atrasados" subtitulo="Sin entregar, del que lleva más días al que menos">
        {d.atrasados.length === 0 ? <p className="m-0 text-[15px] text-pizarra-suave">No hay lotes en proceso.</p> : (
          <div className="-mx-4 overflow-x-auto md:mx-0">
            <table className="w-full min-w-[560px] border-collapse text-left text-[15px]">
              <thead>
                <tr className="bg-rocio-claro text-sm text-pizarra">
                  <th className="px-4 py-2.5 font-semibold">Lote</th>
                  <th className="px-4 py-2.5 font-semibold">Cliente</th>
                  <th className="px-4 py-2.5 font-semibold">Recibido</th>
                  <th className="px-4 py-2.5 font-semibold">Etapa</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Kilos</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Días</th>
                  <th className="px-4 py-2.5 text-right font-semibold">En la etapa</th>
                </tr>
              </thead>
              <tbody>
                {d.atrasados.map((l) => (
                  <tr key={l.id} className="border-t border-linea">
                    <td className="px-4 py-2.5 font-semibold">
                      {veLotes ? <Link to={`/registros/${l.id}`} className="text-esmeralda-oscuro">{l.codigo}</Link> : l.codigo}
                    </td>
                    <td className="px-4 py-2.5">{l.cliente}</td>
                    <td className="px-4 py-2.5 tabular-nums">{fecha(l.fecha)}</td>
                    <td className="px-4 py-2.5">{l.etapa}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{fmtKg(l.kilos)}</td>
                    <td className={cx('px-4 py-2.5 text-right font-bold tabular-nums', l.dias > 10 && 'text-peligro')}>{l.dias}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{l.diasEnEtapa === null ? '—' : `${l.diasEnEtapa} d`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* ---------- Período ---------- */}
      <div className="mt-2 flex flex-col gap-3">
        <h2 className="m-0 text-xl font-bold">En el período</h2>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Período">
          {RANGOS.map((r) => <Chip key={r.id} on={r.id === rangoId} onClick={() => setRangoId(r.id)}>{r.nombre}</Chip>)}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi titulo="Kilos recibidos" valor={kgTxt(t.recibidosKg)} detalle={lotesTxt(t.lotes)} destacado />
        <Kpi titulo="Kilos trillados" valor={kgTxt(t.trilladosKg)} detalle={`Merma promedio ${pctTxt(t.mermaPct)}`} />
        <Kpi titulo="Café en almendra a tostar" valor={kgTxt(t.almendraKg)} detalle="Pesado al tostar" />
        <Kpi titulo="Café tostado" valor={kgTxt(t.tostadoKg)} detalle={`Pérdida en el tueste ${pctTxt(t.perdidaTuestePct)}`} />
        <Kpi titulo="Cobrado" valor={money(t.cobro)} detalle="Lotes ya tostados" />
        <Kpi titulo="Hasta tostar" valor={duracion(d.tiempos.hastaTostarHoras)} detalle="Promedio desde que se recibe" />
        <Kpi titulo="De recibido a entregado" valor={duracion(d.tiempos.totalHoras)} detalle="Promedio" />
        <Kpi titulo="Rendimiento" valor={pctTxt(t.rendimientoPct)} detalle="Kilos tostados por cada 100 recibidos" />
      </div>

      <Panel titulo="Recibido vs. tostado" subtitulo={`Kilos por ${d.periodo.agrupacion === 'dia' ? 'día' : d.periodo.agrupacion}. Si se recibe más de lo que se tuesta, el atraso crece.`}>
        <BarrasV grupos={periodos.map((x) => ({ clave: x.inicio, nombre: x.nombre }))}
          series={[{ clave: 'r', nombre: 'Recibido', color: SERIES[0] }, { clave: 't', nombre: 'Tostado (en almendra)', color: SERIES[1] }]}
          valor={(i, s) => (s === 'r' ? periodos[i].recibidoKg : periodos[i].tostadoKg)} unidad={kgTxt} eje={(v) => fmtNum(v, 0)} />
        <button type="button" onClick={() => setVerTabla((v) => !v)} aria-expanded={verTabla}
          className="self-start text-[15px] font-semibold text-esmeralda-oscuro hover:underline">
          {verTabla ? 'Ocultar la tabla' : 'Ver como tabla'}
        </button>
        {verTabla && (
          <div className="max-h-[320px] overflow-auto">
            <table className="w-full border-collapse text-left text-[15px]">
              <thead className="sticky top-0 bg-rocio-claro text-sm text-pizarra">
                <tr><th className="px-3 py-2">Período</th><th className="px-3 py-2 text-right">Lotes</th><th className="px-3 py-2 text-right">Recibido</th><th className="px-3 py-2 text-right">Tostado</th><th className="px-3 py-2 text-right">Cobrado</th></tr>
              </thead>
              <tbody>
                {periodos.map((x) => (
                  <tr key={x.inicio} className="border-t border-linea tabular-nums">
                    <td className="px-3 py-2">{x.nombre}</td><td className="px-3 py-2 text-right">{x.lotes}</td>
                    <td className="px-3 py-2 text-right">{kgTxt(x.recibidoKg)}</td><td className="px-3 py-2 text-right">{kgTxt(x.tostadoKg)}</td>
                    <td className="px-3 py-2 text-right">{money(x.cobro)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel titulo="Cobrado por período" subtitulo="Por la fecha en que se recibió el lote">
          <BarrasV grupos={periodos.map((x) => ({ clave: x.inicio, nombre: x.nombre }))}
            series={[{ clave: 'c', nombre: 'Cobrado', color: SERIES[2] }]}
            valor={(i) => periodos[i].cobro} unidad={money} eje={(v) => (v >= 1000 ? `${fmtNum(v / 1000, 0)} mil` : fmtNum(v, 0))} />
        </Panel>
        <Panel titulo="Tiempo promedio en cada paso" subtitulo="Con la hora en que el lote llegó a cada etapa">
          <BarrasH partes={d.tiempos.pasos} unidad={duracion} vacio="Todavía no hay lotes con las horas de cada etapa." />
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel titulo="Café recibido por proceso" subtitulo="Kilos recibidos en el período">
          <Dona partes={d.procesos} unidad={kgTxt} total={kgTxt(t.recibidosKg)} />
        </Panel>
        <Panel titulo="En grano o molido" subtitulo="Lotes empacados en el período">
          {d.presentacion.length ? (
            <Dona partes={d.presentacion} unidad={lotesTxt} total={lotesTxt(d.presentacion.reduce((s, x) => s + x.valor, 0))} />
          ) : <p className="m-0 text-[15px] text-pizarra-suave">Todavía no hay lotes empacados con la presentación anotada.</p>}
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel titulo="Clientes que más café trajeron" subtitulo="Kilos recibidos en el período">
          <BarrasH partes={d.clientes} unidad={kgTxt} />
        </Panel>
        <Panel titulo="Rendimiento por proceso" subtitulo="Lo que se pierde en la trilla (merma) y al tostar">
          {d.rendimiento.length === 0 ? <p className="m-0 text-[15px] text-pizarra-suave">Sin datos en este período.</p> : (
            <table className="w-full border-collapse text-left text-[15px]">
              <thead>
                <tr className="bg-rocio-claro text-sm text-pizarra">
                  <th className="px-3 py-2 font-semibold">Proceso</th>
                  <th className="px-3 py-2 text-right font-semibold">Lotes</th>
                  <th className="px-3 py-2 text-right font-semibold">Kilos</th>
                  <th className="px-3 py-2 text-right font-semibold">Merma</th>
                  <th className="px-3 py-2 text-right font-semibold">Tueste</th>
                </tr>
              </thead>
              <tbody>
                {d.rendimiento.map((f) => (
                  <tr key={f.proceso} className="border-t border-linea tabular-nums">
                    <td className="px-3 py-2">{f.proceso}</td>
                    <td className="px-3 py-2 text-right">{f.lotes}</td>
                    <td className="px-3 py-2 text-right">{fmtKg(f.kg)}</td>
                    <td className="px-3 py-2 text-right">{pctTxt(f.mermaPct)}</td>
                    <td className="px-3 py-2 text-right">{pctTxt(f.perdidaTuestePct)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
      </div>
    </main>
  )
}

function Kpi({ titulo, valor, detalle, destacado }: { titulo: string; valor: string; detalle?: string; destacado?: boolean }) {
  return (
    <div className={cx('flex min-w-0 flex-col gap-1 rounded-[14px] border p-4',
      destacado ? 'border-esmeralda bg-esmeralda/5' : 'border-linea bg-white')}>
      <span className="text-sm font-semibold text-pizarra">{titulo}</span>
      <span className="font-display text-2xl font-bold tabular-nums text-bosque [overflow-wrap:anywhere]">{valor}</span>
      {detalle && <span className="text-[13px] text-pizarra-suave">{detalle}</span>}
    </div>
  )
}
