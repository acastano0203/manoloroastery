import { useParams } from 'react-router-dom'
import { RemisionVista } from '../features/remision/components/RemisionVista'

export function RemisionPage() {
  const { id = '' } = useParams()
  return <RemisionVista id={id} />
}
