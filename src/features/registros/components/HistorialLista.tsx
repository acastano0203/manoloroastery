import { useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../../../components/ui/Button'
import { buttonClass } from '../../../components/ui/buttonClass'
import { Icon } from '../../../components/ui/Icon'
import { fecha, hoyISO, money } from '../../../lib/format'
import { useRegistros } from '../hooks/useRegistros'
import type { Registro } from '../types'
import { calcularCobro } from '../utils'

interface Props {
  grupos: Array<[string, Registro[]]>
  vacioTxt: string
}

/** "Hoy", "Ayer" o "lunes 13 oct 2026". */
function dia(iso: string) {
  if (iso === hoyISO()) return 'Hoy'
  if (iso === hoyISO(-1)) return 'Ayer'
  return fecha(iso, true)
}

const totalDia = (lista: Registro[]) => money(lista.reduce((s, r) => s + calcularCobro(r, r.precios).total, 0))

/** Lotes enviados agrupados por día: tabla en escritorio, tarjetas en celular. Cada uno se comparte o se reabre. */
export function HistorialLista({ grupos, vacioTxt }: Props) {
  const [porReabrir, setPorReabrir] = useState<Registro | null>(null)

  if (!grupos.length) {
    return <div className="rounded-xl border border-dashed border-linea-oscuro px-4 py-8 text-center text-pizarra-suave">{vacioTxt}</div>
  }

  return (
    <>
      <div className="hidden overflow-x-auto rounded-xl border border-linea bg-white md:block">
        <table className="w-full border-collapse text-left tabular-nums">
          <thead>
            <tr className="bg-rocio-claro text-sm text-pizarra">
              <th className="px-4 py-3 font-semibold">Lote</th>
              <th className="px-4 py-3 font-semibold">Cliente</th>
              <th className="px-4 py-3 text-right font-semibold">Libras</th>
              <th className="px-4 py-3 text-right font-semibold">Total</th>
              <th className="px-4 py-3 font-semibold">Pago</th>
              <th className="px-4 py-3 text-right font-semibold"><span className="sr-only">Acciones</span></th>
            </tr>
          </thead>
          {grupos.map(([iso, lista]) => (
            <tbody key={iso}>
              <tr className="border-t border-linea bg-rocio">
                <th colSpan={6} scope="colgroup" className="px-4 py-2 text-left text-sm font-semibold text-pizarra">
                  {dia(iso)} <span className="font-normal text-pizarra-suave">· {lista.length} {lista.length === 1 ? 'lote' : 'lotes'} · {totalDia(lista)}</span>
                </th>
              </tr>
              {lista.map((r) => {
                const c = calcularCobro(r, r.precios)
                return (
                  <tr key={r.id} className="border-t border-linea hover:bg-rocio-claro/60">
                    <td className="px-4 py-3 text-sm font-semibold text-pizarra-suave">{r.codigo}</td>
                    <td className="px-4 py-3">
                      <Link to={`/registros/${r.id}`} className="font-semibold text-bosque underline decoration-verde-salvia underline-offset-[3px]">{r.cliente}</Link>
                      {r.almacenamiento && <span className="ml-2 rounded-full bg-verde-menta px-2 py-0.5 text-xs font-semibold text-verde-botella">Almacenado</span>}
                    </td>
                    <td className="px-4 py-3 text-right">{c.librasTxt}</td>
                    <td className="px-4 py-3 text-right font-semibold">{c.totalTxt}</td>
                    <td className="px-4 py-3 text-pizarra">{r.pago ?? '—'}</td>
                    <td className="px-4 py-2">
                      <div className="flex justify-end gap-2">
                        <Link to={`/registros/${r.id}/remision`} className={buttonClass('outline', 'sm')}>
                          <Icon name="compartir" size={18} />
                          Remisión
                        </Link>
                        <Button variant="outline" size="sm" onClick={() => setPorReabrir(r)}>
                          <Icon name="atras" size={18} />
                          Reabrir
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          ))}
        </table>
      </div>

      <div className="flex flex-col gap-4 md:hidden">
        {grupos.map(([iso, lista]) => (
          <section key={iso} aria-label={dia(iso)} className="flex flex-col gap-2">
            <h3 className="m-0 text-[15px] font-semibold text-pizarra">
              {dia(iso)} <span className="font-normal text-pizarra-suave">· {lista.length} · {totalDia(lista)}</span>
            </h3>
            {lista.map((r) => {
              const c = calcularCobro(r, r.precios)
              return (
                <div key={r.id} className="flex flex-col gap-2.5 rounded-xl border border-linea bg-white p-3.5">
                  <Link to={`/registros/${r.id}`} className="flex w-full flex-col gap-0.5 text-bosque no-underline">
                    <span className="flex items-baseline justify-between gap-3">
                      <span className="min-w-0 text-[17px] font-semibold [overflow-wrap:anywhere]">{r.cliente}</span>
                      <span className="whitespace-nowrap text-[17px] font-bold tabular-nums">{c.totalTxt}</span>
                    </span>
                    <span className="text-[15px] text-pizarra-suave tabular-nums">
                      {r.codigo} · {c.librasTxt} · {r.pago ?? 'Sin dato'}{r.almacenamiento && ' · Almacenado'}
                    </span>
                  </Link>
                  <div className="grid grid-cols-2 gap-2">
                    <Link to={`/registros/${r.id}/remision`} className={buttonClass('outline', 'md')}>
                      <Icon name="compartir" size={18} />
                      Remisión
                    </Link>
                    <Button variant="outline" size="md" onClick={() => setPorReabrir(r)}>
                      <Icon name="atras" size={18} />
                      Reabrir
                    </Button>
                  </div>
                </div>
              )
            })}
          </section>
        ))}
      </div>

      {porReabrir && <ConfirmarReabrir r={porReabrir} onCerrar={() => setPorReabrir(null)} />}
    </>
  )
}

/** Confirmación antes de reabrir: el lote ya está en contabilidad. */
function ConfirmarReabrir({ r, onCerrar }: { r: Registro; onCerrar: () => void }) {
  const { reabrir } = useRegistros()
  const idTitulo = useId()
  const caja = useRef<HTMLDivElement>(null)
  const [reabriendo, setReabriendo] = useState(false)

  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => { if (e.key === 'Escape') onCerrar() }
    document.addEventListener('keydown', alTeclear)
    caja.current?.focus()
    return () => document.removeEventListener('keydown', alTeclear)
  }, [onCerrar])

  async function confirmar() {
    setReabriendo(true)
    await reabrir(r)
    onCerrar()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-[rgba(18,38,32,0.45)] sm:items-center sm:p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onCerrar() }}>
      <div ref={caja} role="alertdialog" aria-modal="true" aria-labelledby={idTitulo} tabIndex={-1}
        className="flex w-full max-w-[460px] flex-col gap-4 rounded-t-2xl bg-white p-5 outline-none sm:rounded-2xl">
        <h2 id={idTitulo} className="m-0 text-xl font-bold">¿Reabrir {r.codigo} de {r.cliente}?</h2>
        <ul className="m-0 flex flex-col gap-1.5 pl-5 text-[15px] text-pizarra">
          <li>Vuelve al tablero en <strong>Entregado</strong>, pendiente de enviar.</li>
          <li>Podrás editarlo o devolverlo a una etapa anterior.</li>
          <li>Ya está en contabilidad: después de modificarlo hay que <strong>enviarlo otra vez</strong>. Si cambias el cobro, revisa la factura en Siigo.</li>
        </ul>
        <div className="grid grid-cols-[1fr_2fr] gap-2">
          <Button variant="outline" size="xl" onClick={onCerrar}>Cancelar</Button>
          <Button size="xl" onClick={() => void confirmar()} disabled={reabriendo} className="font-bold">
            {reabriendo ? 'Reabriendo…' : 'Sí, reabrir'}
          </Button>
        </div>
      </div>
    </div>
  )
}
