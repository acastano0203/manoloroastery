import { useState } from 'react'
import { Button } from '../../../../components/ui/Button'
import { FieldError } from '../../../../components/ui/FieldError'
import { Icon } from '../../../../components/ui/Icon'
import { mensajeError } from '../../../../lib/errores'
import { fechaHora } from '../../../../lib/format'
import { usePermisos } from '../../../admin/hooks/usePermisos'
import { etapasDe, yaEsta } from '../../etapas'
import { useRegistros } from '../../hooks/useRegistros'
import { guardarDescripciones } from '../../services/registrosService'
import type { Etapa, Registro } from '../../types'
import { DescripcionCampo, TITULO_DESCRIPCION } from '../form/DescripcionCampo'

/**
 * Descripción de cada etapa a la que ya llegó el lote. La de la trilla aparece cuando el lote queda en Trillado;
 * las de recibir, tostar, empacar y entregar también se anotan al registrar ese paso. Para cambiarla se pulsa "Editar".
 */
export function DescripcionesEtapas({ r }: { r: Registro }) {
  const { puede } = usePermisos()
  const editable = puede('tablero')
  const etapas = etapasDe(r).filter((e) => yaEsta(r, e))
  if (!editable && !etapas.some((e) => r.descripciones[e])) return null

  return (
    <section aria-labelledby="t-descripciones" className="flex flex-col gap-4 rounded-[14px] border border-linea bg-white p-4 sm:p-5">
      <h2 id="t-descripciones" className="m-0 text-xl font-bold">Descripción por etapa</h2>
      <ul className="m-0 flex list-none flex-col gap-4 p-0">
        {etapas.filter((e) => editable || r.descripciones[e]).map((e) => (
          <li key={e}><Descripcion r={r} etapa={e} editable={editable} /></li>
        ))}
      </ul>
    </section>
  )
}

function Descripcion({ r, etapa, editable }: { r: Registro; etapa: Etapa; editable: boolean }) {
  const { recargar } = useRegistros()
  const guardada = r.descripciones[etapa] ?? ''
  const [editando, setEditando] = useState(false)
  const [texto, setTexto] = useState(guardada)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function editar() {
    setTexto(guardada)
    setError(null)
    setEditando(true)
  }

  async function guardar() {
    setGuardando(true)
    try {
      await guardarDescripciones(r.id, { ...r.descripciones, [etapa]: texto })
      await recargar()
      setEditando(false)
      setError(null)
    } catch (err) {
      setError(mensajeError(err))
    } finally {
      setGuardando(false)
    }
  }

  if (editando) {
    return (
      <div className="flex flex-col gap-2">
        <DescripcionCampo etapa={etapa} value={texto} onChange={setTexto} opcional />
        {error && <FieldError>{error}</FieldError>}
        <div className="grid grid-cols-[1fr_2fr] gap-2 sm:max-w-[360px]">
          <Button variant="outline" size="lg" onClick={() => setEditando(false)} disabled={guardando}>Cancelar</Button>
          <Button size="lg" onClick={() => void guardar()} disabled={guardando || texto.trim() === guardada} className="font-bold">
            {guardando ? 'Guardando…' : 'Guardar'}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[15px] font-semibold">{TITULO_DESCRIPCION[etapa]}</span>
        {r.fechasEtapas[etapa] && (
          <time dateTime={r.fechasEtapas[etapa]} className="text-sm text-pizarra-suave tabular-nums">
            {etapa} el {fechaHora(r.fechasEtapas[etapa])}
          </time>
        )}
        {guardada
          ? <p className="m-0 whitespace-pre-line text-[15px] text-pizarra [overflow-wrap:anywhere]">{guardada}</p>
          : <p className="m-0 text-[15px] text-pizarra-suave">Sin descripción.</p>}
      </div>
      {editable && (
        <Button variant="outline" size="sm" onClick={editar} className="shrink-0" aria-label={`Editar ${TITULO_DESCRIPCION[etapa].toLowerCase()}`}>
          <Icon name="editar" size={18} />
          Editar
        </Button>
      )}
    </div>
  )
}
