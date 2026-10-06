import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { mensajeError } from '../../../lib/errores'
import { dec, parseG, parseKg } from '../../../lib/format'
import { useClientes } from '../../clientes/hooks/useClientes'
import type { Cliente } from '../../clientes/types'
import { useConfig } from '../../configuracion/hooks/useConfig'
import { formDesdeRegistro, formVacio, validarRegistro, type CampoForm, type FormRegistro } from '../formulario'
import { actualizarRegistro, crearRegistro } from '../services/registrosService'
import type { RegistroDatos } from '../types'
import { calcularCobro, esEditable } from '../utils'
import { useRegistros } from './useRegistros'

/** Estado, validación y guardado del formulario de registro (nuevo o edición). */
export function useRegistroForm(registroId?: string) {
  const { registros, recargar, setAviso } = useRegistros()
  const { crear: crearCliente, actualizar: actualizarCliente } = useClientes()
  const { config } = useConfig()
  const navigate = useNavigate()
  const existente = registroId ? registros.find((r) => r.id === registroId) : undefined

  const [form, setForm] = useState<FormRegistro>(() => (existente ? formDesdeRegistro(existente) : formVacio()))
  const [listo, setListo] = useState(!registroId || Boolean(existente))
  const [tocados, setTocados] = useState<Partial<Record<CampoForm, boolean>>>({})
  const [intentado, setIntentado] = useState(false)
  const [formMsg, setFormMsg] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  // Al editar, los registros pueden llegar después del primer render.
  useEffect(() => {
    if (!listo && existente) {
      setForm(formDesdeRegistro(existente))
      setListo(true)
    }
  }, [existente, listo])

  const todos = useMemo(() => validarRegistro(form), [form])
  const mostrar = (k: CampoForm): string | false => (intentado || tocados[k] ? todos[k] ?? false : false)
  const errores = {
    cliente: mostrar('cliente'), celular: mostrar('celular'), pago: intentado ? todos.pago ?? false : false,
    kilos: mostrar('kilos'), gramos: mostrar('gramos'), numDoc: mostrar('numDoc'), correo: mostrar('correo'),
  }

  const set = (patch: Partial<FormRegistro>) => {
    setForm((f) => ({ ...f, ...patch }))
    setFormMsg(null)
  }
  const tocar = (k: CampoForm) => setTocados((t) => ({ ...t, [k]: true }))

  const g = parseG(form.gramos)
  const k = parseKg(form.kilos)
  const cobro = config
    ? calcularCobro({ gramos: g && g > 0 ? g : 0, n340: form.n340, n500: form.n500, n2500: form.n2500 }, config.precios)
    : null
  const avisoCantidad = g && k && g > 0 && k > 0 && g > k * 1000
    ? `Es más de lo recibido (${dec(k * 1000, 0)} g). Revisa las cantidades.`
    : null

  async function guardar() {
    const n = Object.keys(todos).length
    if (n) {
      setIntentado(true)
      setFormMsg(`Revisa ${n} ${n === 1 ? 'campo marcado' : 'campos marcados'}`)
      return
    }
    if (!config) return
    setGuardando(true)
    try {
      const datosCliente = { nombre: form.cliente, celular: form.celular, factura: form.factura, tipoDoc: form.tipoDoc, numDoc: form.numDoc, correo: form.correo }
      const cliente: Cliente = form.clienteNuevo || !form.clienteId
        ? await crearCliente(datosCliente)
        : await actualizarCliente(form.clienteId, datosCliente)
      // Si el registro falla, el cliente ya quedó creado: no volver a crearlo al reintentar.
      setForm((f) => ({ ...f, clienteId: cliente.id, clienteNuevo: false }))

      const datos: RegistroDatos = {
        clienteId: cliente.id, fecha: form.fecha, cliente: cliente.nombre, celular: cliente.celular,
        factura: cliente.factura, tipoDoc: cliente.tipoDoc, numDoc: cliente.numDoc, correo: cliente.correo,
        pago: form.pago!, proceso: form.proceso, kilos: k!, gramos: g!, n340: form.n340, n500: form.n500, n2500: form.n2500,
      }
      const r = registroId
        ? await actualizarRegistro(registroId, datos, config.precios)
        : await crearRegistro(datos, config.precios)
      await recargar()
      setAviso({ kind: 'ok', text: registroId ? `Cambios guardados en ${r.cliente}.` : `Lote ${r.codigo} guardado: ${r.cliente}. Está en ${r.etapa}.` })
      navigate(registroId ? `/registros/${r.id}` : '/')
    } catch (e) {
      setFormMsg(mensajeError(e))
    } finally {
      setGuardando(false)
    }
  }

  return {
    form, set, tocar, errores, cobro, avisoCantidad, formMsg, guardando, guardar,
    precios: config?.precios ?? null,
    listo,
    noEncontrado: Boolean(registroId) && !existente,
    bloqueado: existente ? !esEditable(existente) : false,
    titulo: existente ? `Editar lote ${existente.codigo}` : 'Nuevo lote',
    guardarTxt: registroId ? 'Guardar cambios' : 'Guardar lote',
  }
}

export type RegistroFormApi = ReturnType<typeof useRegistroForm>
