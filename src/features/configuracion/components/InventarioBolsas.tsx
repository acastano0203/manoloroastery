import { cx } from '../../../lib/cx'
import { BOLSAS } from '../../registros/utils'
import { nivel, quedanTxt } from '../inventario'
import { ALERTA_INVENTARIO, type Inventario } from '../types'

/** Lo que se escribió en cada cantidad (solo las que se tocaron). */
export type InventarioBorrador = Partial<Record<keyof Inventario, string>>

const ESTILO = {
  ok: 'bg-verde-menta text-verde-botella',
  bajo: 'bg-amber-100 text-amber-900',
  agotado: 'bg-red-100 text-red-800',
} as const

/**
 * Cantidad en bodega de cada bolsa y de los drips. Se descuenta sola al registrar bolsas en los lotes;
 * aquí se fija lo que se contó (al comprar o al hacer inventario). Vacío: no se lleva inventario.
 */
export function InventarioBolsas({ inventario, borrador, cambiar }: {
  inventario: Inventario
  borrador: InventarioBorrador
  cambiar: (k: keyof Inventario, v: string) => void
}) {
  return (
    <section aria-labelledby="t-inventario" className="flex flex-col gap-3.5 rounded-[14px] border border-linea bg-white p-4 sm:p-5">
      <div className="flex flex-col gap-1">
        <h2 id="t-inventario" className="m-0 text-[17px] font-bold">Inventario de bolsas y drips</h2>
        <p className="m-0 text-sm text-pizarra-suave">
          Escribe cuántas hay en bodega al comprar o al contar. Se descuentan solas cuando un lote registra bolsas
          (al recibir o al empacar); las de «Sin bolsa» no. Avisa cuando quedan {ALERTA_INVENTARIO} o menos.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {BOLSAS.map((b) => {
          const actual = inventario[b.n]
          const n = nivel(actual)
          const id = `stock-${b.n}`
          return (
            <div key={b.n} className="flex flex-col gap-2">
              <label htmlFor={id} className="text-[15px] font-semibold">{b.plural} en bodega</label>
              <input id={id} inputMode="numeric" placeholder="Sin inventario"
                value={borrador[b.n] ?? (actual === null ? '' : String(actual))}
                onChange={(e) => cambiar(b.n, e.target.value.replace(/[^\d]/g, ''))}
                className="h-14 w-full rounded-[10px] border border-verde-salvia bg-white px-4 text-lg tabular-nums focus:border-esmeralda" />
              {n !== 'sin' && (
                <span className={cx('self-start rounded-full px-2.5 py-0.5 text-[13px] font-semibold', ESTILO[n])}>
                  {n === 'ok' ? `Quedan ${actual}` : quedanTxt(actual!)}{n === 'bajo' && ' · por agotarse'}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

/** Las cantidades que se cambiaron, listas para guardar ("" = dejar de llevar inventario). */
export function cambiosInventario(borrador: InventarioBorrador, actual: Inventario): Partial<Inventario> {
  const cambios: Partial<Inventario> = {}
  for (const [k, v] of Object.entries(borrador) as Array<[keyof Inventario, string]>) {
    const nuevo = v === '' ? null : Number(v)
    if (nuevo !== actual[k]) cambios[k] = nuevo
  }
  return cambios
}
