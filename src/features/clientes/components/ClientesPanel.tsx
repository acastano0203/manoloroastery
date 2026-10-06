import { useMemo, useState } from 'react'
import { Alert, type AlertKind } from '../../../components/ui/Alert'
import { Button } from '../../../components/ui/Button'
import { Icon } from '../../../components/ui/Icon'
import { Loading } from '../../../components/ui/Loading'
import { PageHeading } from '../../../components/ui/PageHeading'
import { SearchInput } from '../../../components/ui/SearchInput'
import { mensajeError } from '../../../lib/errores'
import { norm } from '../../../lib/format'
import { useRegistros } from '../../registros/hooks/useRegistros'
import { useClientes } from '../hooks/useClientes'
import type { Cliente, ClienteDatos } from '../types'
import { clienteVacio } from '../validacion'
import { ClienteForm } from './ClienteForm'
import { ClienteItem } from './ClienteItem'

export function ClientesPanel() {
  const { clientes, cargando, error, crear, actualizar, eliminar } = useClientes()
  const { registros } = useRegistros()
  const [editando, setEditando] = useState<Cliente | 'nuevo' | null>(null)
  const [msg, setMsg] = useState<{ kind: AlertKind; text: string } | null>(null)
  const [q, setQ] = useState('')

  const usos = useMemo(() => {
    const m = new Map<string, number>()
    registros.forEach((r) => m.set(r.clienteId, (m.get(r.clienteId) ?? 0) + 1))
    return m
  }, [registros])

  const lista = useMemo(() => {
    const nq = norm(q.trim()), qd = q.replace(/\D/g, '')
    return clientes.filter((k) => !nq || norm(k.nombre).includes(nq) || (qd.length >= 3 && k.celular.includes(qd)))
  }, [clientes, q])

  async function guardar(datos: ClienteDatos) {
    if (editando === 'nuevo') await crear(datos)
    else if (editando) await actualizar(editando.id, datos)
    setMsg({ kind: 'ok', text: `Cliente ${datos.nombre.trim()} ${editando === 'nuevo' ? 'creado' : 'actualizado'}.` })
    setEditando(null)
  }

  async function borrar(k: Cliente) {
    const n = usos.get(k.id) ?? 0
    if (n) return setMsg({ kind: 'error', text: `${k.nombre} tiene ${n} registros. No se puede eliminar.` })
    try {
      await eliminar(k.id)
      setMsg({ kind: 'ok', text: `Cliente ${k.nombre} eliminado.` })
    } catch (e) {
      setMsg({ kind: 'error', text: mensajeError(e) })
    }
  }

  const editar = (k: Cliente) => {
    setMsg(null)
    setEditando(k)
    window.scrollTo(0, 0)
  }

  return (
    <main className="mx-auto flex w-full max-w-[1000px] flex-1 flex-col gap-5 px-4 pb-16 pt-6">
      <PageHeading
        title={<>Clientes <span className="text-lg font-semibold text-cafe-suave">({clientes.length})</span></>}
        subtitle="Se usan en el formulario para cargar nombre, celular y datos de factura."
        action={!editando && (
          <Button size="lg" onClick={() => { setMsg(null); setEditando('nuevo') }} className="w-full sm:w-auto">
            <Icon name="mas" size={20} />
            Nuevo cliente
          </Button>
        )}
      />
      {error && <Alert kind="error">{error}</Alert>}
      {msg && <Alert kind={msg.kind} onClose={() => setMsg(null)}>{msg.text}</Alert>}
      {editando && (
        <ClienteForm
          key={editando === 'nuevo' ? 'nuevo' : editando.id}
          titulo={editando === 'nuevo' ? 'Nuevo cliente' : 'Editar cliente'}
          inicial={editando === 'nuevo' ? clienteVacio() : editando}
          clientes={clientes}
          idEditando={editando === 'nuevo' ? null : editando.id}
          onGuardar={guardar}
          onCancelar={() => setEditando(null)}
        />
      )}
      <SearchInput value={q} onChange={setQ} placeholder="Buscar por nombre o celular" ariaLabel="Buscar cliente" />
      {cargando ? <Loading /> : (
        <div className="flex flex-col gap-2.5">
          {lista.map((k) => (
            <ClienteItem key={k.id} cliente={k} nRegistros={usos.get(k.id) ?? 0} onEditar={() => editar(k)} onEliminar={() => void borrar(k)} />
          ))}
          {lista.length === 0 && (
            <div className="px-4 py-6 text-center text-cafe-suave">
              {clientes.length ? 'No hay clientes con esa búsqueda.' : 'Aún no hay clientes. Crea el primero con «Nuevo cliente» o desde el formulario de registro.'}
            </div>
          )}
        </div>
      )}
    </main>
  )
}
