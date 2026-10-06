import { useMemo } from 'react'
import { ETAPAS } from '../etapas'
import { useRegistros } from '../hooks/useRegistros'
import type { Etapa, Registro } from '../types'
import { LoteTarjeta } from './LoteTarjeta'

const GRUPOS: ReadonlyArray<{ etapa: Etapa; titulo: string; texto: string }> = [
  { etapa: 'Recibido', titulo: 'Recibido', texto: 'Falta trillar (pergamino) o tostar (verde).' },
  { etapa: 'Trillado', titulo: 'Trillado', texto: 'Falta tostar.' },
  { etapa: 'Tostado', titulo: 'Tostado', texto: 'Falta empacar.' },
  { etapa: 'Empacado', titulo: 'Empacado', texto: 'Listo para entregar.' },
  { etapa: 'Entregado', titulo: 'Entregado · por enviar', texto: 'Falta enviar a contabilidad. Después se comparte la remisión.' },
]

/** Lotes en proceso agrupados por etapa. Los entregados y enviados van en el Historial. */
export function LotesPorEtapa() {
  const { registros } = useRegistros()
  const grupos = useMemo(() => {
    const m = new Map<Etapa, Registro[]>(ETAPAS.map((e) => [e, []]))
    // Los más antiguos primero: son los que llevan más tiempo esperando.
    for (const r of [...registros].reverse()) {
      if (r.etapa === 'Entregado' && r.estado === 'Enviado') continue
      m.get(r.etapa)?.push(r)
    }
    return m
  }, [registros])

  return (
    <div className="flex flex-col gap-6">
      {GRUPOS.map((g) => {
        const lista = grupos.get(g.etapa) ?? []
        const id = `etapa-${g.etapa}`
        return (
          <section key={g.etapa} aria-labelledby={id} className="flex flex-col gap-3">
            <div className="flex flex-col gap-0.5">
              <h2 id={id} className="m-0 text-xl font-bold">
                {g.titulo} <span className="text-base font-semibold text-cafe-suave">({lista.length})</span>
              </h2>
              {lista.length > 0 && <p className="m-0 text-[15px] text-cafe-suave">{g.texto}</p>}
            </div>
            {lista.length > 0 ? (
              <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-3">
                {lista.map((r) => <LoteTarjeta key={r.id} r={r} />)}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-arena-oscuro px-4 py-3 text-[15px] text-cafe-suave">Ninguno.</div>
            )}
          </section>
        )
      })}
    </div>
  )
}
