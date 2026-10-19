// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Registro } from '../types'
import { EtapaPanel } from './detalle/EtapaPanel'
import { LotesPorEtapa } from './LotesPorEtapa'

const ctx = { registros: [] as Registro[], avanzar: vi.fn(async () => {}), regresar: vi.fn(async () => {}), enviar: vi.fn(async () => {}) }
vi.mock('../hooks/useRegistros', () => ({ useRegistros: () => ctx }))
// Permisos del rol en cada prueba (por defecto, todos).
const permisos = { todos: true, lista: [] as string[] }
vi.mock('../../admin/hooks/usePermisos', () => ({ usePermisos: () => ({ puede: (p: string) => permisos.todos || permisos.lista.includes(p) }) }))

let n = 0
const lote = (p: Partial<Registro>): Registro => ({
  id: `id-${++n}`, codigo: `L-${String(n).padStart(4, '0')}`, clienteId: 'c', fecha: '2026-10-06', cliente: `Cliente ${n}`,
  celular: '3001234567', factura: false, tipoDoc: 'CC', numDoc: '', correo: '', pago: null, proceso: 'Pergamino',
  kilos: 10, humedad: null, densidad: null, gramos: 5000, n340: 0, n500: 0, n2500: 0, nDrip: 0, bolsasCliente: false, gramosTostado: null, estado: 'Pendiente', etapa: 'Recibido', llegada: 'Pergamino',
  precios: { lb: 3000, p340: 1500, p500: 1800, p2500: 4000, pDrip: 2500 }, entregadoAt: null, reabiertoAt: null, almacenamiento: null, ...p,
})

const dibujar = (ui: React.ReactNode) => render(<MemoryRouter>{ui}</MemoryRouter>)
const columna = (titulo: RegExp) => screen.getByRole('heading', { name: titulo }).closest('li') as HTMLElement

afterEach(() => { cleanup(); vi.clearAllMocks(); permisos.todos = true; permisos.lista = [] })

describe('Tablero de lotes por etapa', () => {
  it('pone cada lote en la columna de su etapa y deja el historial aparte', () => {
    ctx.registros = [
      lote({ cliente: 'Ana', etapa: 'Recibido' }),
      lote({ cliente: 'Beto', etapa: 'Recibido', llegada: 'Verde' }),
      lote({ cliente: 'Caro', etapa: 'Tostado' }),
      lote({ cliente: 'Dani', etapa: 'Entregado', estado: 'Pendiente' }),
      lote({ cliente: 'Eva', etapa: 'Entregado', estado: 'Enviado' }),
    ]
    dibujar(<LotesPorEtapa />)
    expect(within(columna(/^Recibido/)).getAllByText(/Ana|Beto/)).toHaveLength(2)
    expect(within(columna(/^Trillado/)).getByText('Ninguno')).toBeTruthy()
    expect(within(columna(/^Tostado/)).getByText('Caro')).toBeTruthy()
    expect(within(columna(/^Entregado/)).getByText('Dani')).toBeTruthy()
    expect(screen.queryByText('Eva')).toBeNull()
  })

  it('el botón dice el siguiente paso; el café verde va directo a tostar', () => {
    ctx.registros = [lote({ cliente: 'Ana', gramos: null }), lote({ cliente: 'Beto', llegada: 'Verde', gramos: null })]
    dibujar(<LotesPorEtapa />)
    const [beto, ana] = within(columna(/^Recibido/)).getAllByRole('button')
    // La lista muestra primero los más antiguos (el arreglo viene del más nuevo al más viejo).
    expect(beto.textContent).toBe('Tostar')
    expect(ana.textContent).toBe('Trillar')
  })

  it('un lote recibido no muestra peso en almendra', () => {
    ctx.registros = [lote({ cliente: 'Ana', gramos: null })]
    dibujar(<LotesPorEtapa />)
    expect(screen.queryByText(/en almendra/)).toBeNull()
  })

  it('pasos sin datos que anotar avanzan directo', () => {
    const r = lote({ etapa: 'Recibido', gramos: null })
    ctx.registros = [r]
    dibujar(<LotesPorEtapa />)
    fireEvent.click(screen.getByRole('button', { name: 'Trillar' }))
    expect(ctx.avanzar).toHaveBeenCalledWith(r, undefined)
  })

  it('al entregar pregunta si requiere almacenamiento; si no, avanza sin él', () => {
    const r = lote({ etapa: 'Empacado', gramosTostado: 4200 })
    ctx.registros = [r]
    dibujar(<LotesPorEtapa />)
    fireEvent.click(screen.getByRole('button', { name: 'Entregar' }))
    const ventana = screen.getByRole('dialog', { name: 'Entregar' })
    fireEvent.click(within(ventana).getByRole('button', { name: 'Pasar a Entregado' }))
    expect(within(ventana).getByText('Indica si el café queda almacenado.')).toBeTruthy()
    fireEvent.click(within(ventana).getByRole('button', { name: 'No' }))
    fireEvent.click(within(ventana).getByRole('button', { name: 'Pasar a Entregado' }))
    expect(ctx.avanzar).toHaveBeenCalledWith(r, { almacenamiento: null })
  })

  it('con almacenamiento pide días (máx. 10), cantidad, marcado y foto', () => {
    const r = lote({ etapa: 'Empacado', gramosTostado: 4200 })
    ctx.registros = [r]
    dibujar(<LotesPorEtapa />)
    fireEvent.click(screen.getByRole('button', { name: 'Entregar' }))
    const ventana = screen.getByRole('dialog', { name: 'Entregar' })
    fireEvent.click(within(ventana).getByRole('button', { name: 'Sí' }))
    fireEvent.change(within(ventana).getByLabelText('Cantidad a almacenar'), { target: { value: '5000' } })
    fireEvent.click(within(ventana).getByRole('button', { name: 'Pasar a Entregado' }))
    expect(within(ventana).getByText(/No puede ser más de lo tostado/)).toBeTruthy()
    expect(within(ventana).getByText('Describe cómo va marcado el café.')).toBeTruthy()
    expect(within(ventana).getByText('Toma o elige una foto como evidencia.')).toBeTruthy()
    expect(ctx.avanzar).not.toHaveBeenCalled()

    const mas = within(ventana).getByRole('button', { name: 'Un día más' })
    for (let i = 0; i < 12; i++) fireEvent.click(mas)
    expect(within(ventana).getByText('10 días')).toBeTruthy()
    expect((mas as HTMLButtonElement).disabled).toBe(true)

    const foto = new File(['x'], 'bolsas.jpg', { type: 'image/jpeg' })
    fireEvent.change(within(ventana).getByLabelText('Cantidad a almacenar'), { target: { value: '3.000' } })
    fireEvent.change(within(ventana).getByLabelText('Cómo va marcado'), { target: { value: 'Bolsa kraft, nombre y fecha' } })
    fireEvent.change(within(ventana).getByLabelText('Foto de evidencia'), { target: { files: [foto] } })
    fireEvent.click(within(ventana).getByRole('button', { name: 'Pasar a Entregado' }))
    expect(ctx.avanzar).toHaveBeenCalledWith(r, { almacenamiento: { dias: 10, gramos: 3000, unidad: 'g', marcado: 'Bolsa kraft, nombre y fecha', foto } })
  })

  it('la cantidad almacenada se puede anotar en gramos, kilos o libras', () => {
    const r = lote({ etapa: 'Empacado', gramosTostado: 4200 })
    ctx.registros = [r]
    dibujar(<LotesPorEtapa />)
    fireEvent.click(screen.getByRole('button', { name: 'Entregar' }))
    const ventana = screen.getByRole('dialog', { name: 'Entregar' })
    fireEvent.click(within(ventana).getByRole('button', { name: 'Sí' }))
    const cantidad = within(ventana).getByLabelText('Cantidad a almacenar') as HTMLInputElement
    expect(cantidad.value).toBe('4.200') // arranca con el peso tostado, en gramos
    fireEvent.change(cantidad, { target: { value: '3.000' } })
    fireEvent.click(within(ventana).getByRole('button', { name: 'Kilos' }))
    expect(cantidad.value).toBe('3')
    fireEvent.click(within(ventana).getByRole('button', { name: 'Libras' }))
    expect(cantidad.value).toBe('6') // libra de 500 g
    fireEvent.change(cantidad, { target: { value: '9' } })
    fireEvent.change(within(ventana).getByLabelText('Cómo va marcado'), { target: { value: 'Bolsa roja' } })
    fireEvent.change(within(ventana).getByLabelText('Foto de evidencia'), { target: { files: [new File(['x'], 'f.jpg', { type: 'image/jpeg' })] } })
    fireEvent.click(within(ventana).getByRole('button', { name: 'Pasar a Entregado' }))
    // 9 lb = 4.500 g: más de lo tostado (4.200 g)
    expect(within(ventana).getByText('No puede ser más de lo tostado (8,4 lb).')).toBeTruthy()
    fireEvent.change(cantidad, { target: { value: '7,5' } })
    fireEvent.click(within(ventana).getByRole('button', { name: 'Pasar a Entregado' }))
    expect(ctx.avanzar).toHaveBeenCalledWith(r, { almacenamiento: expect.objectContaining({ gramos: 3750, unidad: 'lb' }) })
  })

  it('al tostar pide el café a tostar antes de avanzar', () => {
    const r = lote({ etapa: 'Trillado', gramos: null, kilos: 10 })
    ctx.registros = [r]
    dibujar(<LotesPorEtapa />)
    fireEvent.click(screen.getByRole('button', { name: 'Tostar' }))
    const ventana = screen.getByRole('dialog', { name: 'Tostar' })
    fireEvent.click(within(ventana).getByRole('button', { name: 'Pasar a Tostado' }))
    expect(within(ventana).getByText('Escribe el peso en almendra.')).toBeTruthy()
    expect(ctx.avanzar).not.toHaveBeenCalled()

    fireEvent.change(within(ventana).getByLabelText('Peso en almendra (café verde)'), { target: { value: '3.500' } })
    expect(within(ventana).getByText('7,00 lb')).toBeTruthy()
    // 10 kg recibidos → 3,5 kg en almendra
    expect(within(ventana).getByText('65,0 %')).toBeTruthy()
    // Merma alta: avisa, pero deja seguir
    expect(within(ventana).getByText(/supera el 20 %/)).toBeTruthy()
    fireEvent.click(within(ventana).getByRole('button', { name: 'Pasar a Tostado' }))
    expect(ctx.avanzar).toHaveBeenCalledWith(r, { gramos: 3500 })
  })

  it('al empacar pide el peso tostado, bolsas y drips antes de avanzar', () => {
    const r = lote({ etapa: 'Tostado', gramos: 5000 })
    ctx.registros = [r]
    dibujar(<LotesPorEtapa />)
    fireEvent.click(screen.getByRole('button', { name: 'Empacar' }))
    const ventana = screen.getByRole('dialog', { name: 'Empacar' })
    fireEvent.click(within(ventana).getByRole('button', { name: 'Agregar bolsa 340 g' }))
    fireEvent.click(within(ventana).getByRole('button', { name: 'Agregar bolsa 340 g' }))
    fireEvent.click(within(ventana).getByRole('button', { name: 'Agregar drip' }))

    // Sin el peso tostado no avanza
    fireEvent.click(within(ventana).getByRole('button', { name: 'Pasar a Empacado' }))
    expect(within(ventana).getByText('Pesa el café tostado y escribe los gramos.')).toBeTruthy()
    expect(ctx.avanzar).not.toHaveBeenCalled()

    fireEvent.change(within(ventana).getByLabelText('Peso del café tostado'), { target: { value: '4.200' } })
    expect(within(ventana).getByText('16,0 %')).toBeTruthy()
    fireEvent.click(within(ventana).getByRole('button', { name: 'Pasar a Empacado' }))
    expect(ctx.avanzar).toHaveBeenCalledWith(r, { n340: 2, n500: 0, n2500: 0, nDrip: 1, bolsasCliente: false, gramosTostado: 4200 })
  })

  it('sin bolsa: oculta las bolsas, las deja en 0 y conserva los drips', () => {
    const r = lote({ etapa: 'Tostado', gramos: 5000, n340: 3 })
    ctx.registros = [r]
    dibujar(<LotesPorEtapa />)
    fireEvent.click(screen.getByRole('button', { name: 'Empacar' }))
    const ventana = screen.getByRole('dialog', { name: 'Empacar' })
    fireEvent.click(within(ventana).getByRole('checkbox', { name: /Sin bolsa/ }))
    expect(within(ventana).queryByRole('button', { name: 'Agregar bolsa 340 g' })).toBeNull()
    fireEvent.click(within(ventana).getByRole('button', { name: 'Agregar drip' }))
    fireEvent.change(within(ventana).getByLabelText('Peso del café tostado'), { target: { value: '4200' } })
    fireEvent.click(within(ventana).getByRole('button', { name: 'Pasar a Empacado' }))
    expect(ctx.avanzar).toHaveBeenCalledWith(r, { n340: 0, n500: 0, n2500: 0, nDrip: 1, bolsasCliente: true, gramosTostado: 4200 })
  })

  it('el café tostado no puede pesar más que la almendra', () => {
    ctx.registros = [lote({ etapa: 'Tostado', gramos: 5000 })]
    dibujar(<LotesPorEtapa />)
    fireEvent.click(screen.getByRole('button', { name: 'Empacar' }))
    const ventana = screen.getByRole('dialog', { name: 'Empacar' })
    fireEvent.change(within(ventana).getByLabelText('Peso del café tostado'), { target: { value: '6000' } })
    fireEvent.click(within(ventana).getByRole('button', { name: 'Pasar a Empacado' }))
    expect(within(ventana).getByText(/No puede pesar más que el café en almendra/)).toBeTruthy()
    expect(ctx.avanzar).not.toHaveBeenCalled()
  })

  it('cancelar cierra la ventana sin avanzar', () => {
    ctx.registros = [lote({ etapa: 'Tostado' })]
    dibujar(<LotesPorEtapa />)
    fireEvent.click(screen.getByRole('button', { name: 'Empacar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(ctx.avanzar).not.toHaveBeenCalled()
  })

  it('un rol sin "Tablero" ve los lotes pero no los mueve', () => {
    permisos.todos = false
    permisos.lista = ['historial']
    ctx.registros = [lote({ etapa: 'Recibido', gramos: null }), lote({ etapa: 'Entregado', estado: 'Pendiente' })]
    dibujar(<LotesPorEtapa />)
    expect(screen.queryByRole('button', { name: 'Trillar' })).toBeNull()
    expect((screen.getByRole('button', { name: /Enviar/ }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('un entregado sin enviar muestra Enviar, no el siguiente paso', () => {
    const r = lote({ etapa: 'Entregado', estado: 'Error' })
    ctx.registros = [r]
    dibujar(<LotesPorEtapa />)
    expect(screen.queryByRole('button', { name: 'Entregar' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /Reenviar/ }))
    expect(ctx.enviar).toHaveBeenCalledWith(r.id)
  })
})

describe('Panel de etapa en el detalle', () => {
  it('muestra las 5 etapas y permite volver a la anterior', () => {
    const r = lote({ etapa: 'Tostado' })
    dibujar(<EtapaPanel r={r} />)
    expect(screen.getAllByRole('listitem')).toHaveLength(5)
    expect(screen.getByRole('listitem', { current: 'step' }).textContent).toContain('Tostado')
    fireEvent.click(screen.getByRole('button', { name: /Volver a Trillado/ }))
    expect(ctx.regresar).toHaveBeenCalledWith(r)
  })

  it('café verde: 4 etapas, sin trilla', () => {
    dibujar(<EtapaPanel r={lote({ llegada: 'Verde' })} />)
    expect(screen.getAllByRole('listitem')).toHaveLength(4)
    expect(screen.getByText(/no pasa por trilla/)).toBeTruthy()
    expect(screen.getByRole('button', { name: /Siguiente paso · Tostar/ })).toBeTruthy()
  })

  it('entregado: sin "Siguiente paso"', () => {
    dibujar(<EtapaPanel r={lote({ etapa: 'Entregado' })} />)
    expect(screen.queryByRole('button', { name: /Siguiente paso/ })).toBeNull()
    expect(screen.getByRole('button', { name: /Volver a Empacado/ })).toBeTruthy()
  })
})
