import { Navigate } from 'react-router-dom'
import { Alert } from '../../../../components/ui/Alert'
import { Field } from '../../../../components/ui/Field'
import { Loading } from '../../../../components/ui/Loading'
import { PageHeading } from '../../../../components/ui/PageHeading'
import { TextInput } from '../../../../components/ui/TextInput'
import { useRegistros } from '../../hooks/useRegistros'
import { useRegistroForm } from '../../hooks/useRegistroForm'
import { BolsasRecepcion, BolsasSelector } from './BolsasSelector'
import { CafeCampos } from './CafeCampos'
import { ClienteCampos } from './ClienteCampos'
import { DescripcionCampo } from './DescripcionCampo'
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
        {f.existente && <p className="m-0 -mt-3 text-[15px] text-pizarra-suave">
          El lote está en <strong className="text-bosque">{f.existente.etapa}</strong>: aquí cambias los datos de esa etapa y los del cliente.
        </p>}
        <div className="grid gap-5 sm:grid-cols-2">
          {/* El nombre del lote se puede cambiar en cualquier etapa. */}
          <Field label="Lote (opcional)" htmlFor="codigo" error={f.errores.codigo}
            hint={f.existente ? 'Si lo borras, vuelve al consecutivo.' : 'Si el cliente no trae nombre de lote, déjalo vacío: queda el consecutivo (L-0013).'}>
            <TextInput id="codigo" maxLength={40} placeholder="Ej: Lote El Mirador" value={f.form.codigo} error={f.errores.codigo}
              onChange={(e) => { f.set({ codigo: e.target.value }); f.tocar('codigo') }} onBlur={() => f.tocar('codigo')} />
          </Field>
          {f.editaRecepcion && (
            <Field label="Fecha" htmlFor="fecha">
              <TextInput id="fecha" type="date" value={f.form.fecha} onChange={(e) => f.set({ fecha: e.target.value })} />
            </Field>
          )}
        </div>
        <ClienteCampos f={f} />
        <FacturaCampos f={f} />
        <CafeCampos f={f} />
        {f.editaRecepcion && <BolsasRecepcion f={f} />}
        {f.editaRecepcion && (
          <DescripcionCampo id="descripcion" etapa="Recibido" value={f.form.descripcion} onChange={(v) => f.set({ descripcion: v })} opcional />
        )}
        {f.pideBolsas && <BolsasSelector f={f} />}
      </main>
      <ResumenCobroBar f={f} />
    </>
  )
}
