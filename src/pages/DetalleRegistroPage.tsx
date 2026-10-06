import { useParams } from 'react-router-dom'
import { RegistroDetalle } from '../features/registros/components/detalle/RegistroDetalle'

export function DetalleRegistroPage() {
  const { id = '' } = useParams()
  return <RegistroDetalle id={id} />
}
