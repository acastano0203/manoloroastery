/** Convierte errores de Supabase/Postgres en un texto corto para mostrar. */
export function mensajeError(e: unknown): string {
  const err = e as { code?: string; message?: string } | null
  if (err?.code === '23505') return 'Ya existe un cliente con ese nombre.'
  if (err?.code === '23503') return 'Tiene lotes asociados, no se puede eliminar.'
  if (err?.code === '23001') return 'Tiene abonos registrados, no se puede eliminar.'
  if (err?.code === '42501') return 'No tienes permiso para esta acción.'
  if (err?.message === 'Failed to fetch') return 'Sin conexión. Revisa el internet e intenta de nuevo.'
  return err?.message || 'Algo salió mal. Intenta de nuevo.'
}
