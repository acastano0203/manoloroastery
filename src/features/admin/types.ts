import type { Database } from '../../types/database'

export type Permiso = Database['public']['Enums']['permiso']

/** Lo que puede hacer cada rol. El rol Administrador puede todo. */
export const PERMISOS: ReadonlyArray<{ p: Permiso; nombre: string; detalle: string }> = [
  { p: 'tablero', nombre: 'Tablero', detalle: 'Lotes en proceso, pasar de etapa y enviar a contabilidad' },
  { p: 'nuevo_lote', nombre: 'Nuevo lote', detalle: 'Crear, editar y eliminar lotes' },
  { p: 'curvas', nombre: 'Curvas de tostión', detalle: 'Registrar la curva manual y subir el PDF' },
  { p: 'historial', nombre: 'Historial', detalle: 'Lotes enviados, remisiones y reabrir' },
  { p: 'reportes', nombre: 'Reportes', detalle: 'Kilos en proceso, atrasos y gráficas del período' },
  { p: 'clientes', nombre: 'Clientes', detalle: 'Ver y editar la lista de clientes' },
  { p: 'configuracion', nombre: 'Configuración', detalle: 'Precios, inventario de bolsas y conexión con Siigo' },
  { p: 'administracion', nombre: 'Administración', detalle: 'Usuarios y roles' },
]

/**
 * Los ítems del menú, en el orden en que aparecen. Marcar uno le da al rol todos sus permisos;
 * Registros además deja escoger qué puede hacer adentro.
 */
export const MENUS: ReadonlyArray<{ menu: string; detalle: string; permisos: readonly Permiso[] }> = [
  { menu: 'Registros', detalle: 'Lotes: tablero, crear lotes, curvas de tostión e historial', permisos: ['tablero', 'nuevo_lote', 'curvas', 'historial'] },
  { menu: 'Reportes', detalle: 'Kilos en proceso, atrasos y gráficas del período', permisos: ['reportes'] },
  { menu: 'Clientes', detalle: 'Ver y editar la lista de clientes', permisos: ['clientes'] },
  { menu: 'Configuración', detalle: 'Precios, inventario de bolsas y conexión con Siigo', permisos: ['configuracion'] },
  { menu: 'Administración', detalle: 'Crear usuarios, asignarles rol y armar roles', permisos: ['administracion'] },
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
