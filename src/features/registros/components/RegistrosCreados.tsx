import { useRegistros } from '../hooks/useRegistros'
import { CreadoFila } from './CreadoFila'
import { CreadoTarjeta } from './CreadoTarjeta'
import { TablaEncabezado } from './TablaEncabezado'

/** Registros aún no enviados: tabla en escritorio, tarjetas en celular. */
export function RegistrosCreados() {
  const { registros } = useRegistros()
  const creados = registros.filter((r) => r.estado !== 'Enviado')
  const vacio = 'No hay registros por enviar.'

  return (
    <section aria-labelledby="t-creados" className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <h2 id="t-creados" className="m-0 text-xl font-bold">
          Registros creados <span className="text-base font-semibold text-cafe-suave">({creados.length})</span>
        </h2>
        <p className="m-0 text-[15px] text-cafe-suave">Aún no se han enviado. Se pueden editar, eliminar o enviar.</p>
      </div>

      <div className="hidden overflow-x-auto rounded-xl border border-arena bg-white md:block">
        <table className="w-full border-collapse text-left tabular-nums">
          <TablaEncabezado ultima="Acciones" />
          <tbody>
            {creados.map((r) => <CreadoFila key={r.id} r={r} />)}
          </tbody>
        </table>
        {creados.length === 0 && <div className="px-5 py-8 text-center text-cafe-suave">{vacio}</div>}
      </div>

      <div className="flex flex-col gap-2.5 md:hidden">
        {creados.map((r) => <CreadoTarjeta key={r.id} r={r} />)}
        {creados.length === 0 && (
          <div className="rounded-xl border border-dashed border-dorado bg-white px-4 py-6 text-center text-cafe-suave">{vacio}</div>
        )}
      </div>
    </section>
  )
}
