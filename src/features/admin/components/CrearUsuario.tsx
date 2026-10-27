import { useId, useState, type FormEvent } from 'react'
import { Button } from '../../../components/ui/Button'
import { FieldError } from '../../../components/ui/FieldError'
import { Icon } from '../../../components/ui/Icon'
import { mensajeError } from '../../../lib/errores'
import type { AdminApi } from '../hooks/useAdmin'
import { usePermisos } from '../hooks/usePermisos'
import { crearUsuario } from '../services/adminService'

const CLAVE_MINIMA = 8

/** Contraseña al azar de 10 caracteres, sin letras que se confundan (0/O, 1/l/I). */
export function generarClave() {
  const letras = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const azar = crypto.getRandomValues(new Uint32Array(10))
  return Array.from(azar, (n) => letras[n % letras.length]).join('')
}

type Errores = Partial<Record<'correo' | 'clave' | 'rol', string>>

function validar(correo: string, clave: string, rolId: string): Errores {
  const e: Errores = {}
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(correo.trim())) e.correo = 'Correo no válido.'
  if (clave.length < CLAVE_MINIMA) e.clave = `Mínimo ${CLAVE_MINIMA} caracteres.`
  if (!rolId) e.rol = 'Elige un rol.'
  return e
}

/** Formulario para que el administrador cree un usuario con su rol. */
export function CrearUsuario({ api }: { api: AdminApi }) {
  const id = useId()
  const { esAdmin } = usePermisos()
  const [abierto, setAbierto] = useState(false)
  const [correo, setCorreo] = useState('')
  const [nombre, setNombre] = useState('')
  const [clave, setClave] = useState('')
  const [verClave, setVerClave] = useState(false)
  const [rolId, setRolId] = useState('')
  const [intentado, setIntentado] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [creando, setCreando] = useState(false)
  const [creado, setCreado] = useState<{ correo: string; clave: string; rol: string } | null>(null)
  const [copiado, setCopiado] = useState(false)

  const errores = intentado ? validar(correo, clave, rolId) : {}

  async function crear(e: FormEvent) {
    e.preventDefault()
    setIntentado(true)
    if (Object.keys(validar(correo, clave, rolId)).length) return
    setCreando(true)
    setError(null)
    try {
      await crearUsuario({ correo: correo.trim(), clave, nombre, rolId })
      setCreado({ correo: correo.trim().toLowerCase(), clave, rol: api.roles.find((r) => r.id === rolId)?.nombre ?? '' })
      setCorreo(''); setNombre(''); setClave(''); setRolId(''); setIntentado(false); setAbierto(false)
      await api.ejecutar(async () => {})
    } catch (err) {
      setError(mensajeError(err))
    } finally {
      setCreando(false)
    }
  }

  async function copiar() {
    if (!creado) return
    try {
      await navigator.clipboard.writeText(`Usuario: ${creado.correo}\nContraseña: ${creado.clave}`)
      setCopiado(true)
    } catch { /* el navegador no dejó copiar: los datos siguen en pantalla */ }
  }

  return (
    <div className="flex flex-col gap-3">
      {creado && (
        <div role="status" className="flex flex-col gap-2 rounded-xl border-2 border-verde-salvia bg-verde-menta/50 p-4 text-verde-botella">
          <span className="font-bold">Usuario creado como {creado.rol}.</span>
          <span className="text-[15px]">Compártele estos datos para que entre. La contraseña no se vuelve a mostrar.</span>
          <code className="rounded-lg bg-white px-3 py-2 text-[15px] text-bosque">
            {creado.correo}<br />{creado.clave}
          </code>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => void copiar()}>{copiado ? 'Copiado' : 'Copiar datos'}</Button>
            <Button variant="link" onClick={() => { setCreado(null); setCopiado(false) }}>Cerrar</Button>
          </div>
        </div>
      )}

      {!abierto ? (
        <Button size="lg" onClick={() => { setAbierto(true); setCreado(null); setCopiado(false) }} className="self-start font-bold">
          <Icon name="mas" size={20} />
          Crear usuario
        </Button>
      ) : (
        <form onSubmit={(e) => void crear(e)} noValidate className="flex flex-col gap-4 rounded-[14px] border-2 border-verde-salvia bg-panel p-4 sm:p-5">
          <h3 className="m-0 text-lg font-bold">Nuevo usuario</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor={`${id}-correo`} className="text-[15px] font-semibold">Correo</label>
              <input id={`${id}-correo`} type="email" autoComplete="off" value={correo} onChange={(e) => setCorreo(e.target.value)}
                aria-invalid={errores.correo ? true : undefined} placeholder="nombre@correo.com"
                className="h-12 rounded-[10px] border border-verde-salvia bg-white px-4 text-[16px] focus:border-esmeralda" />
              {errores.correo && <FieldError>{errores.correo}</FieldError>}
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor={`${id}-nombre`} className="text-[15px] font-semibold">Nombre (opcional)</label>
              <input id={`${id}-nombre`} value={nombre} maxLength={80} onChange={(e) => setNombre(e.target.value)}
                className="h-12 rounded-[10px] border border-verde-salvia bg-white px-4 text-[16px] focus:border-esmeralda" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor={`${id}-clave`} className="text-[15px] font-semibold">Contraseña</label>
              <div className="flex gap-2">
                <input id={`${id}-clave`} type={verClave ? 'text' : 'password'} autoComplete="new-password" value={clave}
                  onChange={(e) => setClave(e.target.value)} aria-invalid={errores.clave ? true : undefined}
                  className="h-12 min-w-0 flex-1 rounded-[10px] border border-verde-salvia bg-white px-4 text-[16px] focus:border-esmeralda" />
                <Button variant="outline" size="md" onClick={() => setVerClave((v) => !v)} aria-pressed={verClave}>{verClave ? 'Ocultar' : 'Ver'}</Button>
              </div>
              <button type="button" onClick={() => { setClave(generarClave()); setVerClave(true) }}
                className="self-start text-[15px] font-semibold text-esmeralda-oscuro underline">Generar una segura</button>
              {errores.clave && <FieldError>{errores.clave}</FieldError>}
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor={`${id}-rol`} className="text-[15px] font-semibold">Rol</label>
              <select id={`${id}-rol`} value={rolId} onChange={(e) => setRolId(e.target.value)} aria-invalid={errores.rol ? true : undefined}
                className="h-12 rounded-[10px] border border-verde-salvia bg-white px-3 text-[16px] font-semibold">
                <option value="">Elige un rol</option>
                {api.roles.filter((r) => esAdmin || !r.administrador).map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
              </select>
              {errores.rol && <FieldError>{errores.rol}</FieldError>}
            </div>
          </div>
          {error && <FieldError>{error}</FieldError>}
          <div className="grid grid-cols-[1fr_2fr] gap-2 sm:max-w-md">
            <Button variant="outline" size="lg" onClick={() => { setAbierto(false); setError(null); setIntentado(false) }}>Cancelar</Button>
            <Button type="submit" size="lg" disabled={creando} className="font-bold">{creando ? 'Creando…' : 'Crear usuario'}</Button>
          </div>
        </form>
      )}
    </div>
  )
}
