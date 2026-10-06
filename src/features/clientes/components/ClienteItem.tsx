import { useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { Icon } from '../../../components/ui/Icon'
import { cel } from '../../../lib/format'
import type { Cliente } from '../types'

interface Props {
  cliente: Cliente
  nRegistros: number
  onEditar: () => void
  onEliminar: () => void
}

export function ClienteItem({ cliente: k, nRegistros, onEditar, onEliminar }: Props) {
  const [confirmando, setConfirmando] = useState(false)
  const factura = k.factura ? `Factura ${k.tipoDoc} ${k.numDoc || '(falta número)'}` : 'Sin factura'

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-arena bg-white px-4 py-3.5">
      <div className="flex min-w-0 flex-[1_1_220px] flex-col gap-0.5">
        <span className="text-[17px] font-semibold">{k.nombre}</span>
        <span className="text-[15px] text-cafe-suave tabular-nums">{cel(k.celular)} · {factura}</span>
      </div>
      <div className="min-w-[90px] text-sm text-cafe-suave">{nRegistros} {nRegistros === 1 ? 'registro' : 'registros'}</div>
      {confirmando ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[15px] font-semibold text-red-800">¿Eliminar cliente?</span>
          <Button variant="danger" size="sm" onClick={() => { setConfirmando(false); onEliminar() }}>Sí, eliminar</Button>
          <Button variant="outline" size="sm" onClick={() => setConfirmando(false)}>No</Button>
        </div>
      ) : (
        <div className="flex gap-1.5">
          <Button variant="outline" size="sm" onClick={onEditar}>Editar</Button>
          <Button variant="dangerOutline" size="sm" onClick={() => setConfirmando(true)} aria-label={`Eliminar cliente ${k.nombre}`} className="w-11 !px-0">
            <Icon name="eliminar" size={18} />
          </Button>
        </div>
      )}
    </div>
  )
}
