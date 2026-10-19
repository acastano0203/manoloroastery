import { useNavigate } from 'react-router-dom'
import { Alert } from '../../../components/ui/Alert'
import { cx } from '../../../lib/cx'
import { useRegistros } from '../hooks/useRegistros'

export function AvisoRegistros() {
  const { aviso, setAviso, error, moverA } = useRegistros()
  const navigate = useNavigate()

  if (error) return <Alert kind="error">{error}</Alert>
  if (!aviso) return null

  const boton = cx(
    'h-11 rounded-lg border bg-white px-3.5 font-bold',
    aviso.kind === 'ok' ? 'border-esmeralda-oscuro text-esmeralda-oscuro' : 'border-pizarra-suave text-bosque',
  )
  const { registroId, deshacer } = aviso

  return (
    <Alert
      kind={aviso.kind}
      onClose={() => setAviso(null)}
      action={
        <>
          {deshacer && (
            <button type="button" onClick={() => void moverA(deshacer.id, deshacer.etapa)} className={boton}>
              Deshacer
            </button>
          )}
          {registroId && (
            <button
              type="button"
              onClick={() => {
                setAviso(null)
                navigate(`/registros/${registroId}/remision`)
              }}
              className={boton}
            >
              Ver remisión
            </button>
          )}
        </>
      }
    >
      {aviso.text}
    </Alert>
  )
}
