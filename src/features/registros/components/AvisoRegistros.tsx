import { useNavigate } from 'react-router-dom'
import { Alert } from '../../../components/ui/Alert'
import { useRegistros } from '../hooks/useRegistros'

export function AvisoRegistros() {
  const { aviso, setAviso, error } = useRegistros()
  const navigate = useNavigate()

  if (error) return <Alert kind="error">{error}</Alert>
  if (!aviso) return null

  return (
    <Alert
      kind={aviso.kind}
      onClose={() => setAviso(null)}
      action={
        aviso.registroId && (
          <button
            type="button"
            onClick={() => {
              setAviso(null)
              navigate(`/registros/${aviso.registroId}/remision`)
            }}
            className="h-11 rounded-lg border border-green-800 bg-white px-3.5 font-bold text-green-800"
          >
            Ver remisión
          </button>
        )
      }
    >
      {aviso.text}
    </Alert>
  )
}
