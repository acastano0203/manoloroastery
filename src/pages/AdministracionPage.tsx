import { useState } from 'react'
import { Alert } from '../components/ui/Alert'
import { Loading } from '../components/ui/Loading'
import { PageHeading } from '../components/ui/PageHeading'
import { RolesAdmin } from '../features/admin/components/RolesAdmin'
import { UsuariosAdmin } from '../features/admin/components/UsuariosAdmin'
import { useAdmin } from '../features/admin/hooks/useAdmin'
import { cx } from '../lib/cx'

type Pestana = 'usuarios' | 'roles'

export function AdministracionPage() {
  const api = useAdmin()
  const [pestana, setPestana] = useState<Pestana>('usuarios')
  return (
    <main className="mx-auto flex w-full max-w-[880px] flex-1 flex-col gap-5 px-4 pb-12 pt-6">
      <PageHeading title="Administración" />
      <div role="tablist" aria-label="Administración" className="flex self-start rounded-xl bg-rocio-claro p-1">
        {([['usuarios', 'Usuarios'], ['roles', 'Roles y permisos']] as const).map(([k, texto]) => (
          <button key={k} type="button" role="tab" id={`tab-${k}`} aria-selected={pestana === k} aria-controls={`panel-${k}`}
            onClick={() => setPestana(k)}
            className={cx('h-11 rounded-lg px-4 text-[15px] font-semibold', pestana === k ? 'bg-white text-esmeralda-oscuro shadow-sm' : 'text-pizarra')}>
            {texto}
          </button>
        ))}
      </div>
      {api.error && <Alert kind="error" onClose={() => api.setError(null)}>{api.error}</Alert>}
      {api.ok && <Alert kind="ok" onClose={() => api.setOk(null)}>{api.ok}</Alert>}
      {api.cargando ? <Loading /> : (
        <div role="tabpanel" id={`panel-${pestana}`} aria-labelledby={`tab-${pestana}`}>
          {pestana === 'usuarios' ? <UsuariosAdmin api={api} /> : <RolesAdmin api={api} />}
        </div>
      )}
    </main>
  )
}
