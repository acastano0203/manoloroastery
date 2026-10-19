import { useId, useState, type FormEvent } from 'react'
import { Button } from '../../../components/ui/Button'
import { Icon } from '../../../components/ui/Icon'
import { cx } from '../../../lib/cx'
import type { AdminApi } from '../hooks/useAdmin'
import { cambiarPermiso, crearRol, eliminarRol, renombrarRol } from '../services/adminService'
import { PERMISOS, type Rol } from '../types'

/** Roles y qué pantallas ve cada uno. */
export function RolesAdmin({ api }: { api: AdminApi }) {
  const id = useId()
  const [nuevo, setNuevo] = useState('')

  async function crear(e: FormEvent) {
    e.preventDefault()
    if (!nuevo.trim()) return api.setError('Escribe el nombre del rol.')
    if (await api.ejecutar(() => crearRol(nuevo), `Rol "${nuevo.trim()}" creado. Marca qué puede ver.`)) setNuevo('')
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={(e) => void crear(e)} className="flex flex-wrap items-end gap-2">
        <label htmlFor={id} className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-[15px] font-semibold">Nuevo rol</span>
          <input id={id} value={nuevo} maxLength={40} placeholder="Ej: Bodega" onChange={(e) => setNuevo(e.target.value)}
            className="h-12 rounded-[10px] border border-verde-salvia bg-white px-4 text-[16px] focus:border-esmeralda" />
        </label>
        <Button type="submit" size="md"><Icon name="mas" size={20} />Crear rol</Button>
      </form>
      <div className="flex flex-col gap-3">
        {api.roles.map((r) => <TarjetaRol key={r.id} r={r} usuarios={api.perfiles.filter((p) => p.rolId === r.id).length} api={api} />)}
      </div>
    </div>
  )
}

function TarjetaRol({ r, usuarios, api }: { r: Rol; usuarios: number; api: AdminApi }) {
  const [nombre, setNombre] = useState(r.nombre)
  const [confirmando, setConfirmando] = useState(false)

  return (
    <section aria-label={`Rol ${r.nombre}`} className="flex flex-col gap-3 rounded-[14px] border border-linea bg-white p-4">
      <div className="flex flex-wrap items-center gap-2">
        {r.administrador ? (
          <h3 className="m-0 flex-1 text-lg font-bold">{r.nombre}</h3>
        ) : (
          <input aria-label={`Nombre del rol ${r.nombre}`} value={nombre} maxLength={40} onChange={(e) => setNombre(e.target.value)}
            onBlur={() => { if (nombre.trim() && nombre.trim() !== r.nombre) void api.ejecutar(() => renombrarRol(r.id, nombre)) }}
            className="h-11 min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 text-lg font-bold hover:border-linea-oscuro focus:border-esmeralda focus:bg-white" />
        )}
        <span className="text-sm text-pizarra-suave">{usuarios} {usuarios === 1 ? 'usuario' : 'usuarios'}</span>
        {!r.administrador && !confirmando && (
          <button type="button" aria-label={`Eliminar el rol ${r.nombre}`} onClick={() => setConfirmando(true)}
            className="flex h-11 w-11 items-center justify-center rounded-lg text-pizarra-suave hover:bg-red-50 hover:text-peligro">
            <Icon name="eliminar" size={18} />
          </button>
        )}
      </div>

      {confirmando && (
        <div className="flex flex-wrap items-center gap-2 rounded-[10px] bg-red-50 p-3">
          <span className="flex-1 text-[15px] font-semibold text-red-800">
            ¿Eliminar el rol {r.nombre}?{usuarios > 0 && ` ${usuarios === 1 ? 'Su usuario queda' : `Sus ${usuarios} usuarios quedan`} sin rol y no verán nada.`}
          </span>
          <Button variant="outline" size="md" onClick={() => setConfirmando(false)}>No</Button>
          <Button variant="danger" size="md" onClick={() => void api.ejecutar(() => eliminarRol(r.id), `Rol "${r.nombre}" eliminado.`)}>Sí, eliminar</Button>
        </div>
      )}

      {r.administrador ? (
        <p className="m-0 text-[15px] text-pizarra">Ve todas las pantallas y administra roles y usuarios. No se puede cambiar ni eliminar.</p>
      ) : (
        <fieldset className="m-0 grid grid-cols-1 gap-2 border-0 p-0 sm:grid-cols-2">
          <legend className="mb-2 p-0 text-[15px] font-semibold">Qué puede ver</legend>
          {PERMISOS.map(({ p, nombre: n, detalle }) => {
            const on = r.permisos.includes(p)
            return (
              <label key={p} className={cx('flex min-h-14 cursor-pointer items-start gap-3 rounded-xl border-2 px-3 py-2.5',
                on ? 'border-esmeralda bg-esmeralda/10' : 'border-linea-oscuro bg-white')}>
                <input type="checkbox" checked={on} className="mt-0.5 h-5 w-5 shrink-0 accent-esmeralda"
                  onChange={(e) => void api.ejecutar(() => cambiarPermiso(r.id, p, e.target.checked))} />
                <span className="flex flex-col">
                  <span className="font-semibold">{n}</span>
                  <span className="text-sm text-pizarra-suave">{detalle}</span>
                </span>
              </label>
            )
          })}
        </fieldset>
      )}
    </section>
  )
}
