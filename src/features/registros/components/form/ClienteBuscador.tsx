import { useMemo, useState, type KeyboardEvent } from 'react'
import { Icon } from '../../../../components/ui/Icon'
import { TextInput } from '../../../../components/ui/TextInput'
import { cx } from '../../../../lib/cx'
import { cel, norm } from '../../../../lib/format'
import type { Cliente } from '../../../clientes/types'

interface Props {
  clientes: Cliente[]
  error: string | false
  onElegir: (c: Cliente) => void
  onCrear: (texto: string) => void
  onBlur: () => void
}

/** Combobox: busca clientes por nombre o celular, o crea uno nuevo con lo escrito. */
export function ClienteBuscador({ clientes, error, onElegir, onCrear, onBlur }: Props) {
  const [q, setQ] = useState('')
  const [abierto, setAbierto] = useState(false)
  const nq = norm(q.trim())
  const qd = q.replace(/\D/g, '')

  const coincidencias = useMemo(
    () => clientes
      .filter((k) => !nq || norm(k.nombre).includes(nq) || (qd.length >= 3 && k.celular.includes(qd)))
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
      .slice(0, 8),
    [clientes, nq, qd],
  )

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (coincidencias[0] && nq) onElegir(coincidencias[0])
      else if (q.trim()) onCrear(q.trim())
    }
    if (e.key === 'Escape') setAbierto(false)
  }

  return (
    <>
      <div className="relative">
        <span className="pointer-events-none absolute left-4 top-[17px] flex text-pizarra-suave"><Icon name="buscar" /></span>
        <TextInput
          id="buscar-cliente" type="text" role="combobox" aria-expanded={abierto} aria-controls="lista-clientes"
          aria-autocomplete="list" autoComplete="off" placeholder="Busca por nombre o celular"
          value={q} error={error} className="pl-[50px] pr-12"
          onChange={(e) => { setQ(e.target.value); setAbierto(true) }}
          onFocus={() => setAbierto(true)}
          onBlur={() => { setAbierto(false); onBlur() }}
          onKeyDown={onKeyDown}
        />
        <span className="pointer-events-none absolute right-4 top-[17px] flex text-pizarra-suave"><Icon name="abajo" /></span>
      </div>
      {abierto && (
        <div id="lista-clientes" role="listbox" aria-label="Clientes"
          className="max-h-[340px] overflow-y-auto rounded-[10px] border border-verde-salvia bg-white shadow-[0_8px_24px_rgba(18,38,32,0.10)]">
          {coincidencias.map((k, i) => (
            <button key={k.id} type="button" role="option" aria-selected={i === 0 && Boolean(nq)}
              onMouseDown={(e) => { e.preventDefault(); onElegir(k) }}
              className={cx('flex min-h-[60px] w-full items-center justify-between gap-3 border-b border-rocio-claro px-4 py-2 text-left',
                i === 0 && nq ? 'bg-verde-menta' : 'bg-white hover:bg-rocio-claro')}>
              <span className="flex min-w-0 flex-col">
                <span className="text-[17px] font-semibold">{k.nombre}</span>
                <span className="text-sm text-pizarra-suave">{cel(k.celular)}</span>
              </span>
              <span className="whitespace-nowrap text-[13px] text-pizarra-suave">{k.factura ? `Factura · ${k.tipoDoc}` : 'Sin factura'}</span>
            </button>
          ))}
          {nq && coincidencias.length === 0 && (
            <div className="px-4 py-3.5 text-[15px] text-pizarra-suave">No hay clientes con «{q}».</div>
          )}
          {!nq && clientes.length === 0 && (
            <div className="px-4 py-3.5 text-[15px] text-pizarra-suave">Aún no hay clientes. Escribe el nombre para crear uno.</div>
          )}
          {q.trim() && (
            <button type="button" role="option" aria-selected={false}
              onMouseDown={(e) => { e.preventDefault(); onCrear(q.trim()) }}
              className="flex min-h-14 w-full items-center gap-2.5 border-t border-linea bg-rocio px-4 text-left text-base font-bold text-esmeralda-oscuro">
              <Icon name="mas" size={20} />
              Crear cliente nuevo: «{q.trim()}»
            </button>
          )}
        </div>
      )}
    </>
  )
}
