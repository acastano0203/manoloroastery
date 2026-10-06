import { useParams } from 'react-router-dom'
import { RegistroForm } from '../features/registros/components/form/RegistroForm'

/** /nuevo y /registros/:id/editar */
export function NuevoRegistroPage() {
  const { id } = useParams()
  return <RegistroForm key={id ?? 'nuevo'} registroId={id} />
}
