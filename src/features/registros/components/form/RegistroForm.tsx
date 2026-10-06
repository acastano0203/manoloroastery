import { Navigate } from 'react-router-dom'
import { Alert } from '../../../../components/ui/Alert'
import { Field } from '../../../../components/ui/Field'
import { Loading } from '../../../../components/ui/Loading'
import { PageHeading } from '../../../../components/ui/PageHeading'
import { TextInput } from '../../../../components/ui/TextInput'
import { useRegistros } from '../../hooks/useRegistros'
import { useRegistroForm } from '../../hooks/useRegistroForm'
import { BolsasSelector } from './BolsasSelector'
import { CafeCampos } from './CafeCampos'
import { ClienteCampos } from './ClienteCampos'
import { FacturaCampos } from './FacturaCampos'
import { ResumenCobroBar } from './ResumenCobroBar'

/** Formulario de nuevo registro o edición de uno pendiente. */
export function RegistroForm({ registroId }: { registroId?: string }) {
  const { cargando } = useRegistros()
  const f = useRegistroForm(registroId)

  if (registroId && cargando) return <Loading />
  if (f.noEncontrado) return <main className="p-6"><Alert kind="error">No se encontró el registro.</Alert></main>
  if (f.bloqueado) return <Navigate to={`/registros/${registroId}`} replace />
  if (!f.listo) return <Loading />

  return (
    <>
      <main className="mx-auto flex w-full max-w-[720px] flex-1 flex-col gap-7 px-4 pb-10 pt-6">
        <PageHeading title={f.titulo} back={{ to: '/', label: 'Registros' }} />
        <Field label="Fecha" htmlFor="fecha" className="max-w-[260px]">
          <TextInput id="fecha" type="date" value={f.form.fecha} onChange={(e) => f.set({ fecha: e.target.value })} />
        </Field>
        <ClienteCampos f={f} />
        <FacturaCampos f={f} />
        <CafeCampos f={f} />
        <BolsasSelector f={f} />
      </main>
      <ResumenCobroBar f={f} />
    </>
  )
}
