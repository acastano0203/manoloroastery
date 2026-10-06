import { matchPath, useLocation } from 'react-router-dom'
import { useRegistros } from '../../features/registros/hooks/useRegistros'

/** Título y botón "volver" de la barra superior del celular según la ruta. */
export function useEncabezado(): { titulo: string; volverA: string | null } {
  const { pathname } = useLocation()
  const { registros } = useRegistros()
  const codigo = (id?: string) => registros.find((r) => r.id === id)?.codigo ?? ''

  const remision = matchPath('/registros/:id/remision', pathname)
  if (remision) return { titulo: `Remisión ${codigo(remision.params.id)}`, volverA: `/registros/${remision.params.id}` }
  const editar = matchPath('/registros/:id/editar', pathname)
  if (editar) return { titulo: `Editar lote ${codigo(editar.params.id)}`, volverA: '/' }
  const detalle = matchPath('/registros/:id', pathname)
  if (detalle) return { titulo: `Lote ${codigo(detalle.params.id)}`, volverA: '/' }
  if (pathname === '/nuevo') return { titulo: 'Nuevo lote', volverA: '/' }
  if (pathname.startsWith('/clientes')) return { titulo: 'Clientes', volverA: null }
  if (pathname.startsWith('/configuracion')) return { titulo: 'Configuración', volverA: null }
  return { titulo: 'Registros', volverA: null }
}
