import { useId, useState, type FormEvent } from 'react'
import { Button } from '../../../components/ui/Button'
import { FieldError } from '../../../components/ui/FieldError'
import { Icon } from '../../../components/ui/Icon'
import { fecha, miles, parseG } from '../../../lib/format'
import { mensajeError } from '../../../lib/errores'
import type { Registro } from '../../registros/types'
import type { TostionesApi } from '../hooks/useTostiones'
import { enlaceArchivo } from '../../../lib/archivos'
import { eliminarTostion, subirCurvaAutomatica } from '../services/tostionesService'
import type { Tostion } from '../types'

const LIMITE_MB = 10

interface Props {
  r: Registro
  /** Todas las tostiones del lote (para numerar los baches). */
  todas: Tostion[]
  editable: boolean
  api: TostionesApi
}

/** Curvas automáticas: el PDF que exporta el software del tostador, guardado en Supabase. */
export function TostionesAutomaticas({ r, todas, editable, api }: Props) {
  const automaticas = todas.filter((t) => t.origen === 'automatica')
  return (
    <div className="flex flex-col gap-4">
      {editable && <SubirPdf r={r} api={api} />}
      {automaticas.length === 0 ? (
        <p className="m-0 text-[15px] text-pizarra-suave">Todavía no hay curvas en PDF para este lote.</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {automaticas.map((t) => (
            <ArchivoCurva key={t.id} t={t} numero={todas.indexOf(t) + 1} editable={editable} api={api} />
          ))}
        </ul>
      )}
    </div>
  )
}

function SubirPdf({ r, api }: { r: Registro; api: TostionesApi }) {
  const id = useId()
  const [archivo, setArchivo] = useState<File | null>(null)
  const [verde, setVerde] = useState(r.gramos ? miles(r.gramos) : '')
  const [notas, setNotas] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [subiendo, setSubiendo] = useState(false)

  async function subir(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const g = parseG(verde)
    if (!archivo) return setError('Elige el PDF de la curva.')
    if (archivo.type !== 'application/pdf' && !archivo.name.toLowerCase().endsWith('.pdf')) return setError('El archivo debe ser un PDF.')
    if (archivo.size > LIMITE_MB * 1024 * 1024) return setError(`El PDF pesa más de ${LIMITE_MB} MB.`)
    if (g === null || isNaN(g) || g <= 0) return setError('Escribe los gramos de café verde del bache.')
    setSubiendo(true)
    setError(null)
    const form = e.currentTarget
    try {
      await subirCurvaAutomatica(r.id, archivo, g, notas)
      setArchivo(null)
      setNotas('')
      form.reset()
      await api.ejecutar(async () => {})
    } catch (err) {
      setError(mensajeError(err))
    } finally {
      setSubiendo(false)
    }
  }

  return (
    <form onSubmit={(e) => void subir(e)} className="flex flex-col gap-4 rounded-[14px] border-2 border-dashed border-verde-salvia bg-panel p-4 sm:p-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${id}-pdf`} className="text-[15px] font-semibold">PDF de la curva (del software del tostador)</label>
        <input id={`${id}-pdf`} type="file" accept="application/pdf,.pdf" onChange={(e) => { setArchivo(e.target.files?.[0] ?? null); setError(null) }}
          className="block w-full rounded-[10px] border border-verde-salvia bg-white p-2 text-[15px] file:mr-3 file:h-11 file:cursor-pointer file:rounded-lg file:border-0 file:bg-esmeralda file:px-4 file:font-semibold file:text-white" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${id}-verde`} className="text-[15px] font-semibold">Café verde del bache</label>
          <div className="relative">
            <input id={`${id}-verde`} inputMode="numeric" value={verde} onChange={(e) => setVerde(e.target.value)}
              className="h-12 w-full rounded-[10px] border border-verde-salvia bg-white pl-4 pr-10 text-lg font-bold tabular-nums focus:border-esmeralda" />
            <span className="pointer-events-none absolute right-4 top-3 text-pizarra-suave">g</span>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${id}-notas`} className="text-[15px] font-semibold">Notas (opcional)</label>
          <input id={`${id}-notas`} value={notas} maxLength={500} onChange={(e) => setNotas(e.target.value)}
            className="h-12 w-full rounded-[10px] border border-verde-salvia bg-white px-4 text-base focus:border-esmeralda" />
        </div>
      </div>
      {error && <FieldError>{error}</FieldError>}
      <Button type="submit" size="xl" disabled={subiendo} className="font-bold">
        <Icon name="nuevo" size={20} />
        {subiendo ? 'Subiendo…' : 'Subir y guardar curva'}
      </Button>
    </form>
  )
}

function ArchivoCurva({ t, numero, editable, api }: { t: Tostion; numero: number; editable: boolean; api: TostionesApi }) {
  const [abriendo, setAbriendo] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const nombre = t.archivo?.split('/').pop()?.replace(/^\d+-/, '') ?? 'curva.pdf'

  async function abrir() {
    if (!t.archivo) return
    // La ventana se abre antes de pedir el enlace: si no, el navegador la bloquea por no venir directo del toque.
    const ventana = window.open('', '_blank')
    setAbriendo(true)
    try {
      const url = await enlaceArchivo(t.archivo)
      if (ventana) ventana.location.href = url
      else window.location.href = url
    } catch (e) {
      ventana?.close()
      await api.ejecutar(() => Promise.reject(e))
    } finally {
      setAbriendo(false)
    }
  }

  return (
    <li className="flex flex-col gap-2 rounded-xl border border-linea bg-white p-3.5">
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex h-11 w-9 shrink-0 items-end justify-center rounded bg-peligro pb-1 text-[10px] font-bold text-white">PDF</span>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="font-semibold [overflow-wrap:anywhere]">Bache {numero} · {nombre}</span>
          <span className="text-sm text-pizarra-suave">{miles(t.gramosVerde)} g de café verde · {fecha(t.creadaAt.slice(0, 10))}</span>
          {t.notas && <span className="text-sm text-pizarra">{t.notas}</span>}
        </div>
        <Button variant="outline" size="md" onClick={() => void abrir()} disabled={abriendo}>
          {abriendo ? 'Abriendo…' : 'Ver PDF'}
        </Button>
        {editable && !confirmando && (
          <button type="button" aria-label={`Eliminar la curva del bache ${numero}`} onClick={() => setConfirmando(true)}
            className="flex h-11 w-11 items-center justify-center rounded-lg text-pizarra-suave hover:bg-red-50 hover:text-peligro">
            <Icon name="eliminar" size={18} />
          </button>
        )}
      </div>
      {confirmando && (
        <div className="flex flex-wrap items-center gap-2 rounded-[10px] bg-red-50 p-3">
          <span className="flex-1 text-[15px] font-semibold text-red-800">¿Eliminar este PDF? No se puede deshacer.</span>
          <Button variant="outline" size="md" onClick={() => setConfirmando(false)}>No</Button>
          <Button variant="danger" size="md" onClick={() => void api.ejecutar(() => eliminarTostion(t))}>Sí, eliminar</Button>
        </div>
      )}
    </li>
  )
}
