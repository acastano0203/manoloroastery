import { useState } from 'react'
import { useAuth } from '../../auth/hooks/useAuth'
import type { AdminApi } from '../hooks/useAdmin'
import { asignarRol, cambiarNombre } from '../services/adminService'
import type { Perfil } from '../types'
import { CrearUsuario } from './CrearUsuario'

/** Usuarios y su rol: crear usuarios, asignar y cambiar el rol. */
export function UsuariosAdmin({ api }: { api: AdminApi }) {
  const { sesion } = useAuth()
  const sinRol = api.perfiles.filter((p) => !p.rolId).length
  return (
    <div className="flex flex-col gap-4">
      <CrearUsuario api={api} />
      <p className="m-0 text-[15px] text-pizarra-suave">
        Los usuarios creados directamente en Supabase también aparecen aquí, sin rol hasta que les asignes uno.
      </p>
      {sinRol > 0 && (
        <p className="m-0 rounded-[10px] bg-amber-100 px-4 py-3 text-[15px] font-semibold text-amber-800">
          {sinRol === 1 ? '1 usuario está esperando' : `${sinRol} usuarios están esperando`} un rol.
        </p>
      )}
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {api.perfiles.map((p) => <FilaUsuario key={p.id} p={p} yo={p.id === sesion?.user.id} api={api} />)}
      </ul>
    </div>
  )
}

function FilaUsuario({ p, yo, api }: { p: Perfil; yo: boolean; api: AdminApi }) {
  const [nombre, setNombre] = useState(p.nombre ?? '')
  const etiqueta = p.correo ?? p.id
  return (
    <li className="flex flex-col gap-3 rounded-xl border border-linea bg-white p-3.5 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="font-semibold [overflow-wrap:anywhere]">{etiqueta}{yo && <span className="font-normal text-pizarra-suave"> (tú)</span>}</span>
        <input aria-label={`Nombre de ${etiqueta}`} value={nombre} maxLength={80} placeholder="Nombre (opcional)"
          onChange={(e) => setNombre(e.target.value)}
          onBlur={() => { if (nombre.trim() !== (p.nombre ?? '')) void api.ejecutar(() => cambiarNombre(p.id, nombre)) }}
          className="h-10 max-w-[280px] rounded-lg border border-linea-oscuro bg-white px-3 text-[15px] focus:border-esmeralda" />
      </div>
      <label className="flex flex-col gap-1 sm:w-56">
        <span className="text-sm text-pizarra-suave">Rol</span>
        <select value={p.rolId ?? ''} aria-label={`Rol de ${etiqueta}`}
          onChange={(e) => {
            const rol = api.roles.find((r) => r.id === e.target.value)
            void api.ejecutar(() => asignarRol(p.id, e.target.value || null), `${etiqueta} ahora es ${rol?.nombre ?? 'sin rol'}.`)
          }}
          className={p.rolId
            ? 'h-12 rounded-[10px] border border-verde-salvia bg-white px-3 text-[16px] font-semibold'
            : 'h-12 rounded-[10px] border-2 border-amber-400 bg-amber-50 px-3 text-[16px] font-semibold'}>
          <option value="">Sin rol (no ve nada)</option>
          {api.roles.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
        </select>
      </label>
    </li>
  )
}
