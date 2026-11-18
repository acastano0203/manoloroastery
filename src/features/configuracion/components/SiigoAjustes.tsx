import { useEffect, useId, useState } from 'react'
import { Alert, type AlertKind } from '../../../components/ui/Alert'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import { Field } from '../../../components/ui/Field'
import { TextInput } from '../../../components/ui/TextInput'
import { mensajeError } from '../../../lib/errores'
import { guardarAjustesSiigo } from '../services/configService'
import { consultarCatalogoSiigo, type CatalogoSiigo } from '../services/siigoService'
import type { AjustesSiigo, Configuracion } from '../types'

const selectClass = 'h-12 w-full min-w-0 rounded-[10px] border border-verde-salvia bg-white px-3 text-[16px]'

/**
 * Lo fijo de la cotización en Siigo: el servicio de torrefacción y el cliente (consumidor final y cómo crear
 * los que no existan). Las bolsas no van aquí: se eligen en cada lote de los productos de Siigo.
 * Comprobante y vendedor solo se piden si en Siigo hay más de uno; si hay uno, la función lo usa solo.
 */
export function SiigoAjustes({ config }: { config: Configuracion }) {
  const idLista = useId()
  const [a, setA] = useState<AjustesSiigo>(config.siigo)
  const [catalogo, setCatalogo] = useState<CatalogoSiigo | null>(null)
  const [cargando, setCargando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [msg, setMsg] = useState<{ kind: AlertKind; text: string } | null>(null)

  async function cargar() {
    setCargando(true)
    try {
      setCatalogo(await consultarCatalogoSiigo())
    } catch (e) {
      setMsg({ kind: 'error', text: `No se pudieron cargar las opciones de Siigo. ${mensajeError(e)}` })
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    void cargar()
  }, [])

  const cambiar = (c: Partial<AjustesSiigo>) => {
    setA((x) => ({ ...x, ...c }))
    setMsg(null)
  }

  const productos = catalogo?.productos ?? []
  const tostion = productos.find((p) => p.code === a.tostion.trim())
  const activos = (l: CatalogoSiigo['cotizaciones'] | undefined) => (l?.datos ?? []).filter((x) => x.active !== false)
  const docs = activos(catalogo?.cotizaciones)
  const vendedores = activos(catalogo?.vendedores)

  async function guardar() {
    if (!a.tostion.trim()) return setMsg({ kind: 'error', text: 'Escribe el código del servicio de torrefacción en Siigo.' })
    if (catalogo && !tostion) return setMsg({ kind: 'error', text: `El producto ${a.tostion} no existe en Siigo.` })
    if (a.departamento && !/^\d{2}$/.test(a.departamento)) return setMsg({ kind: 'error', text: 'El departamento es un código DANE de 2 dígitos (p. ej. 05).' })
    if (a.ciudad && !/^\d{5}$/.test(a.ciudad)) return setMsg({ kind: 'error', text: 'La ciudad es un código DANE de 5 dígitos (p. ej. 05001).' })
    setGuardando(true)
    try {
      await guardarAjustesSiigo(config.id, a)
      setMsg({ kind: 'ok', text: 'Ajustes de Siigo guardados. Se usan en el próximo envío.' })
    } catch (e) {
      setMsg({ kind: 'error', text: mensajeError(e) })
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Card className="gap-[18px]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="m-0 text-lg font-bold">Cotización en Siigo</h2>
        <Button variant="outline" size="md" onClick={cargar} disabled={cargando}>{cargando ? 'Cargando…' : 'Recargar de Siigo'}</Button>
      </div>
      <p className="m-0 text-[15px] text-pizarra-suave">
        Al enviar un lote entregado se crea una cotización en Siigo con la torrefacción por libras y las bolsas que se eligieron en el lote.
        Contabilidad la revisa y la pasa a factura allá.
      </p>

      <Field label="Servicio de torrefacción (por libra)" htmlFor="siigo-tostion"
        hint={tostion ? `${tostion.code} · ${tostion.name}` : catalogo ? 'Escribe el código o busca por nombre.' : undefined}>
        <TextInput id="siigo-tostion" list={idLista} value={a.tostion} autoComplete="off"
          onChange={(e) => cambiar({ tostion: e.target.value.trim() })} />
        <datalist id={idLista}>
          {productos.map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}
        </datalist>
      </Field>

      {docs.length > 1 && (
        <Field label="Comprobante de cotización" htmlFor="siigo-doc" hint="En Siigo hay varios: elige cuál usar.">
          <select id="siigo-doc" className={selectClass} value={a.cotizacionId ?? ''} onChange={(e) => cambiar({ cotizacionId: e.target.value ? Number(e.target.value) : null })}>
            <option value="">Sin elegir</option>
            {docs.map((d) => <option key={d.id} value={d.id}>{d.id} · {d.name}</option>)}
          </select>
        </Field>
      )}
      {vendedores.length > 1 && (
        <Field label="Vendedor" htmlFor="siigo-vendedor" hint="En Siigo hay varios: elige cuál usar.">
          <select id="siigo-vendedor" className={selectClass} value={a.vendedorId ?? ''} onChange={(e) => cambiar({ vendedorId: e.target.value ? Number(e.target.value) : null })}>
            <option value="">Sin elegir</option>
            {vendedores.map((d) => <option key={d.id} value={d.id}>{d.id} · {d.name}</option>)}
          </select>
        </Field>
      )}

      <div className="flex flex-col gap-3 border-t border-linea pt-3.5">
        <h3 className="m-0 text-[15px] font-bold">Cliente</h3>
        <Field label="Identificación de consumidor final" htmlFor="siigo-cf" hint="Para los lotes sin factura a nombre propio. Debe existir en Siigo.">
          <TextInput id="siigo-cf" inputMode="numeric" value={a.consumidorFinal} onChange={(e) => cambiar({ consumidorFinal: e.target.value })} />
        </Field>
        <label className="flex items-center gap-3 text-[15px] font-semibold">
          <input type="checkbox" className="h-5 w-5" checked={a.crearClientes} onChange={(e) => cambiar({ crearClientes: e.target.checked })} />
          Crear en Siigo los clientes con factura que no existan
        </label>
        {a.crearClientes && (
          <>
            <p className="m-0 text-sm text-pizarra-suave">
              Se crean con el nombre, documento, celular y correo del lote. Siigo además exige dirección y ciudad, que la app no pide: se usan estas.
            </p>
            <Field label="Dirección" htmlFor="siigo-dir">
              <TextInput id="siigo-dir" value={a.direccion} onChange={(e) => cambiar({ direccion: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Departamento (código DANE)" htmlFor="siigo-dep" hint="2 dígitos, p. ej. 05">
                <TextInput id="siigo-dep" inputMode="numeric" maxLength={2} value={a.departamento} onChange={(e) => cambiar({ departamento: e.target.value.replace(/\D/g, '') })} />
              </Field>
              <Field label="Ciudad (código DANE)" htmlFor="siigo-ciudad" hint="5 dígitos, p. ej. 05001">
                <TextInput id="siigo-ciudad" inputMode="numeric" maxLength={5} value={a.ciudad} onChange={(e) => cambiar({ ciudad: e.target.value.replace(/\D/g, '') })} />
              </Field>
            </div>
          </>
        )}
      </div>

      <Button variant="secondary" size="xl" onClick={guardar} disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar ajustes de Siigo'}</Button>
      {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}
    </Card>
  )
}
