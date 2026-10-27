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
  precios: { lb: 3000, p340: 1500, p500: 1800, p2500: 4000, pDrip: 2500 }, entregadoAt: null, reabiertoAt: null, almacenamiento: null, descripciones: {}, fechasEtapas: {}, presentacion: null, molienda: null, gramosSobrante: null, ...p,
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

  it('ordena cada etapa por llegada: el primero que llegó está en turno', () => {
    // Caro se creó antes, pero llegó a Tostado después que Beto.
    // La lista viene del más nuevo al más viejo: Beto es más nuevo que Caro.
    ctx.registros = [
      lote({ cliente: 'Beto', etapa: 'Tostado', fechasEtapas: { Tostado: '2026-10-27T09:00:00Z' } }),
      lote({ cliente: 'Caro', etapa: 'Tostado', fechasEtapas: { Tostado: '2026-10-27T11:30:00Z' } }),
    ]
    dibujar(<LotesPorEtapa />)
    const tostado = within(columna(/^Tostado/))
    const [primero, segundo] = tostado.getAllByRole('link', { name: /Beto|Caro/ })
    expect(primero.textContent).toMatch(/^Beto.*En turno/)
    expect(segundo.textContent).toMatch(/^Caro.*Turno 2/)
    expect(tostado.getAllByText(/^Llegó /)).toHaveLength(2)
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
    fireEvent.change(within(ventana).getByLabelText('Cantidad a almacenar'), { target: { value: '5' } })
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
    fireEvent.change(within(ventana).getByLabelText('Cantidad a almacenar'), { target: { value: '3' } })
    fireEvent.change(within(ventana).getByLabelText('Cómo va marcado'), { target: { value: 'Bolsa kraft, nombre y fecha' } })
    fireEvent.change(within(ventana).getByLabelText('Foto de evidencia'), { target: { files: [foto] } })
    fireEvent.click(within(ventana).getByRole('button', { name: 'Pasar a Entregado' }))
    expect(ctx.avanzar).toHaveBeenCalledWith(r, { almacenamiento: { dias: 10, gramos: 3000, unidad: 'kg', marcado: 'Bolsa kraft, nombre y fecha', foto } })
  })

  it('la cantidad almacenada se anota en kilos', () => {
    const r = lote({ etapa: 'Empacado', gramosTostado: 4200 })
    ctx.registros = [r]
    dibujar(<LotesPorEtapa />)
    fireEvent.click(screen.getByRole('button', { name: 'Entregar' }))
    const ventana = screen.getByRole('dialog', { name: 'Entregar' })
    fireEvent.click(within(ventana).getByRole('button', { name: 'Sí' }))
    const cantidad = within(ventana).getByLabelText('Cantidad a almacenar') as HTMLInputElement
    expect(cantidad.value).toBe('4,2') // arranca con el peso tostado
    expect(within(ventana).queryByRole('button', { name: 'Gramos' })).toBeNull()
    fireEvent.change(cantidad, { target: { value: '4,5' } })
    fireEvent.change(within(ventana).getByLabelText('Cómo va marcado'), { target: { value: 'Bolsa roja' } })
    fireEvent.change(within(ventana).getByLabelText('Foto de evidencia'), { target: { files: [new File(['x'], 'f.jpg', { type: 'image/jpeg' })] } })
    fireEvent.click(within(ventana).getByRole('button', { name: 'Pasar a Entregado' }))
    expect(within(ventana).getByText('No puede ser más de lo tostado (4,2 kg).')).toBeTruthy()
    fireEvent.change(cantidad, { target: { value: '3,75' } })
    fireEvent.click(within(ventana).getByRole('button', { name: 'Pasar a Entregado' }))
    expect(ctx.avanzar).toHaveBeenCalledWith(r, { almacenamiento: expect.objectContaining({ gramos: 3750, unidad: 'kg' }) })
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

    fireEvent.change(within(ventana).getByLabelText('Peso en almendra (café verde)'), { target: { value: '3,5' } })
    expect(within(ventana).getByText('7,00 lb')).toBeTruthy()
    // 10 kg recibidos → 3,5 kg en almendra
    expect(within(ventana).getByText('65,0 %')).toBeTruthy()
    // Merma alta: avisa, pero deja seguir
    expect(within(ventana).getByText(/supera el 20 %/)).toBeTruthy()
    fireEvent.click(within(ventana).getByRole('button', { name: 'Pasar a Tostado' }))
    expect(ctx.avanzar).toHaveBeenCalledWith(r, { gramos: 3500 })
  })

  it('al pasar de etapa se puede anotar la descripción, sin perder las de antes', () => {
    const r = lote({ etapa: 'Trillado', gramos: null, kilos: 10, descripciones: { Trillado: 'Salió parejo' } })
    ctx.registros = [r]
    dibujar(<LotesPorEtapa />)
    fireEvent.click(screen.getByRole('button', { name: 'Tostar' }))
    const ventana = screen.getByRole('dialog', { name: 'Tostar' })
    fireEvent.change(within(ventana).getByLabelText('Peso en almendra (café verde)'), { target: { value: '8' } })
    fireEvent.change(within(ventana).getByLabelText(/Descripción de la tostión/), { target: { value: 'Tueste medio' } })
    fireEvent.click(within(ventana).getByRole('button', { name: 'Pasar a Tostado' }))
    expect(ctx.avanzar).toHaveBeenCalledWith(r,
      { gramos: 8000, descripciones: { Trillado: 'Salió parejo', Tostado: 'Tueste medio' } })
  })

  it('al empacar pide el peso tostado, bolsas y drips antes de avanzar', () => {
    const r = lote({ etapa: 'Tostado', gramos: 5000 })
    ctx.registros = [r]
    dibujar(<LotesPorEtapa />)
    fireEvent.click(screen.getByRole('button', { name: 'Empacar' }))
    const ventana = screen.getByRole('dialog', { name: 'Empacar' })
    expect(within(ventana).getByText('Sin bolsas')).toBeTruthy()
    fireEvent.click(within(ventana).getByRole('button', { name: 'Cambiar' }))
    fireEvent.click(within(ventana).getByRole('button', { name: 'Agregar bolsa 340 g' }))
    fireEvent.click(within(ventana).getByRole('button', { name: 'Agregar bolsa 340 g' }))
    fireEvent.click(within(ventana).getByRole('button', { name: 'Agregar drip' }))

    // Sin el peso tostado no avanza
    fireEvent.click(within(ventana).getByRole('button', { name: 'Pasar a Empacado' }))
    expect(within(ventana).getByText('Pesa el café tostado y escribe los kilos.')).toBeTruthy()
    expect(ctx.avanzar).not.toHaveBeenCalled()

    fireEvent.change(within(ventana).getByLabelText('Peso del café tostado'), { target: { value: '4,2' } })
    expect(within(ventana).getByText('16,0 %')).toBeTruthy()
    // Tampoco sin preguntar si va en grano o molido; molido pide la molienda
    fireEvent.click(within(ventana).getByRole('button', { name: 'Pasar a Empacado' }))
    expect(within(ventana).getByText('Pregunta si lo quiere en grano o molido.')).toBeTruthy()
    fireEvent.click(within(ventana).getByRole('button', { name: 'Molido' }))
    fireEvent.click(within(ventana).getByRole('button', { name: 'Pasar a Empacado' }))
    expect(within(ventana).getByText('Elige la molienda.')).toBeTruthy()
    expect(ctx.avanzar).not.toHaveBeenCalled()
    fireEvent.click(within(ventana).getByRole('button', { name: 'Medio' }))
    fireEvent.click(within(ventana).getByRole('button', { name: 'Pasar a Empacado' }))
    expect(ctx.avanzar).toHaveBeenCalledWith(r,
      { n340: 2, n500: 0, n2500: 0, nDrip: 1, bolsasCliente: false, gramosTostado: 4200, gramosSobrante: null, presentacion: 'Molido', molienda: 'Medio' })
  })

  it('sin bolsa: oculta las bolsas, las deja en 0 y conserva los drips', () => {
    const r = lote({ etapa: 'Tostado', gramos: 5000, n340: 3 })
    ctx.registros = [r]
    dibujar(<LotesPorEtapa />)
    fireEvent.click(screen.getByRole('button', { name: 'Empacar' }))
    const ventana = screen.getByRole('dialog', { name: 'Empacar' })
    expect(within(ventana).getByText('3 × 340 g')).toBeTruthy()
    expect(within(ventana).queryByRole('checkbox', { name: /Sin bolsa/ })).toBeNull()
    fireEvent.click(within(ventana).getByRole('button', { name: 'Cambiar' }))
    fireEvent.click(within(ventana).getByRole('checkbox', { name: /Sin bolsa/ }))
    expect(within(ventana).queryByRole('button', { name: 'Agregar bolsa 340 g' })).toBeNull()
    fireEvent.click(within(ventana).getByRole('button', { name: 'Agregar drip' }))
    fireEvent.change(within(ventana).getByLabelText('Peso del café tostado'), { target: { value: '4,2' } })
    fireEvent.click(within(ventana).getByRole('button', { name: 'En grano' }))
    fireEvent.click(within(ventana).getByRole('button', { name: 'Pasar a Empacado' }))
    expect(ctx.avanzar).toHaveBeenCalledWith(r,
      { n340: 0, n500: 0, n2500: 0, nDrip: 1, bolsasCliente: true, gramosTostado: 4200, gramosSobrante: null, presentacion: 'Grano', molienda: null })
  })

  it('al empacar trae las bolsas anotadas al recibir y las conserva si no se cambian', () => {
    const r = lote({ etapa: 'Tostado', gramos: 5000, n500: 2, nDrip: 4 })
    ctx.registros = [r]
    dibujar(<LotesPorEtapa />)
    fireEvent.click(screen.getByRole('button', { name: 'Empacar' }))
    const ventana = screen.getByRole('dialog', { name: 'Empacar' })
    expect(within(ventana).getByText('2 × 500 g · 4 × drip')).toBeTruthy()
    fireEvent.change(within(ventana).getByLabelText('Peso del café tostado'), { target: { value: '4,2' } })
    fireEvent.click(within(ventana).getByRole('button', { name: 'En grano' }))
    fireEvent.click(within(ventana).getByRole('button', { name: 'Pasar a Empacado' }))
    expect(ctx.avanzar).toHaveBeenCalledWith(r,
      { n340: 0, n500: 2, n2500: 0, nDrip: 4, bolsasCliente: false, gramosTostado: 4200, gramosSobrante: null, presentacion: 'Grano', molienda: null })
  })

  it('el café tostado no puede pesar más que la almendra', () => {
    ctx.registros = [lote({ etapa: 'Tostado', gramos: 5000 })]
    dibujar(<LotesPorEtapa />)
    fireEvent.click(screen.getByRole('button', { name: 'Empacar' }))
    const ventana = screen.getByRole('dialog', { name: 'Empacar' })
    fireEvent.change(within(ventana).getByLabelText('Peso del café tostado'), { target: { value: '6' } })
    fireEvent.click(within(ventana).getByRole('button', { name: 'Pasar a Empacado' }))
    expect(within(ventana).getByText(/No puede pesar más que el café en almendra/)).toBeTruthy()
    expect(ctx.avanzar).not.toHaveBeenCalled()
  })

  it('al empacar anota el sobrante en gramos, sin pasar del café tostado', () => {
    const r = lote({ etapa: 'Tostado', gramos: 5000, n340: 12 })
    ctx.registros = [r]
    dibujar(<LotesPorEtapa />)
    fireEvent.click(screen.getByRole('button', { name: 'Empacar' }))
    const ventana = screen.getByRole('dialog', { name: 'Empacar' })
    fireEvent.change(within(ventana).getByLabelText('Peso del café tostado'), { target: { value: '4,2' } })
    fireEvent.click(within(ventana).getByRole('button', { name: 'En grano' }))
    const sobrante = within(ventana).getByLabelText(/Sobrante sin empacar/)
    fireEvent.change(sobrante, { target: { value: '5000' } })
    fireEvent.click(within(ventana).getByRole('button', { name: 'Pasar a Empacado' }))
    expect(within(ventana).getByText('No puede ser más que el café tostado (4,2 kg).')).toBeTruthy()
    expect(ctx.avanzar).not.toHaveBeenCalled()

    fireEvent.change(sobrante, { target: { value: '120' } })
    fireEvent.click(within(ventana).getByRole('button', { name: 'Pasar a Empacado' }))
    expect(ctx.avanzar).toHaveBeenCalledWith(r, expect.objectContaining({ n340: 12, gramosTostado: 4200, gramosSobrante: 120 }))
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
