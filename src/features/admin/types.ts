import type { Database } from '../../types/database'

export type Permiso = Database['public']['Enums']['permiso']

/** Lo que puede ver cada rol. El rol Administrador ve todo y además administra roles y usuarios. */
export const PERMISOS: ReadonlyArray<{ p: Permiso; nombre: string; detalle: string }> = [
  { p: 'tablero', nombre: 'Tablero', detalle: 'Lotes en proceso, pasar de etapa y enviar a contabilidad' },
  { p: 'nuevo_lote', nombre: 'Nuevo lote', detalle: 'Crear, editar y eliminar lotes' },
  { p: 'curvas', nombre: 'Curvas de tostión', detalle: 'Registrar la curva manual y subir el PDF' },
  { p: 'historial', nombre: 'Historial', detalle: 'Lotes enviados, remisiones y reabrir' },
  { p: 'clientes', nombre: 'Clientes', detalle: 'Ver y editar la lista de clientes' },
  { p: 'configuracion', nombre: 'Configuración', detalle: 'Precios y conexión con Siigo' },
]

export interface Rol {
  id: string
  nombre: string
  administrador: boolean
  permisos: Permiso[]
}

export interface Perfil {
  id: string
  correo: string | null
  nombre: string | null
  rolId: string | null
}
