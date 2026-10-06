import { useMemo } from 'react'
import { dec, fecha, hoyISO, money } from '../../../lib/format'
import { calcularCobro } from '../utils'
import { useRegistros } from './useRegistros'

/** Totales del día: libras y dinero por forma de pago. */
export function useResumenHoy() {
  const { registros } = useRegistros()
  return useMemo(() => {
    const hoy = hoyISO()
    const deHoy = registros.filter((r) => r.fecha === hoy).map((r) => ({ r, c: calcularCobro(r, r.precios) }))
    const total = (pago?: string) =>
      deHoy.filter((x) => !pago || x.r.pago === pago).reduce((a, x) => a + x.c.total, 0)
    return {
      fecha: fecha(hoy, true),
      count: deHoy.length,
      libras: dec(deHoy.reduce((a, x) => a + x.c.libras, 0), 2) + ' lb',
      efectivo: money(total('Efectivo')),
      banco: money(total('Banco')),
      bold: money(total('Bold')),
    }
  }, [registros])
}
