// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Registro } from '../types'
import { EtapaPanel } from './detalle/EtapaPanel'
import { LotesPorEtapa } from './LotesPorEtapa'

const ctx = { registros: [] as Registro[], avanzar: vi.fn(async () => {}), regresar: vi.fn(async () => {}), enviar: vi.fn(async () => {}) }
vi.mock('../hooks/useRegistros', () => ({ useRegistros: () => ctx }))

let n = 0
const lote = (p: Partial<Registro>): Registro => ({
  id: `id-${++n}`, codigo: `L-${String(n).padStart(4, '0')}`, clienteId: 'c', fecha: '2026-10-06', cliente: `Cliente ${n}`,
  celular: '3001234567', factura: false, tipoDoc: 'CC', numDoc: '', correo: '', pago: null, proceso: 'Pergamino',
  kilos: 10, gramos: 5000, n340: 0, n500: 0, n2500: 0, estado: 'Pendiente', etapa: 'Recibido', llegada: 'Pergamino',
  precios: { lb: 3000, p340: 1500, p500: 1800, p2500: 4000 }, ...p,
})

const dibujar = (ui: React.ReactNode) => render(<MemoryRouter>{ui}</MemoryRouter>)
const seccion = (titulo: RegExp) => screen.getByRole('heading', { name: titulo }).closest('section') as HTMLElement

afterEach(() => { cleanup(); vi.clearAllMocks() })

describe('Registros agrupados por etapa', () => {
  it('pone cada lote en su etapa y deja el historial aparte', () => {
    ctx.registros = [
      lote({ cliente: 'Ana', etapa: 'Recibido' }),
      lote({ cliente: 'Beto', etapa: 'Recibido', llegada: 'Verde' }),
      lote({ cliente: 'Caro', etapa: 'Tostado' }),
      lote({ cliente: 'Dani', etapa: 'Entregado', estado: 'Pendiente' }),
      lote({ cliente: 'Eva', etapa: 'Entregado', estado: 'Enviado' }),
    ]
    dibujar(<LotesPorEtapa />)
    expect(within(seccion(/^Recibido/)).getAllByText(/Ana|Beto/)).toHaveLength(2)
    expect(within(seccion(/^Trillado/)).getByText('Ninguno.')).toBeTruthy()
    expect(within(seccion(/^Tostado/)).getByText('Caro')).toBeTruthy()
    expect(within(seccion(/^Entregado/)).getByText('Dani')).toBeTruthy()
    expect(screen.queryByText('Eva')).toBeNull()
  })

  it('el botón dice el siguiente paso; el café verde va directo a tostar', () => {
    ctx.registros = [lote({ cliente: 'Ana' }), lote({ cliente: 'Beto', llegada: 'Verde' })]
    dibujar(<LotesPorEtapa />)
    const [ana, beto] = screen.getAllByRole('button', { name: /Siguiente paso/ })
    // La lista muestra primero los más antiguos (el arreglo viene del más nuevo al más viejo).
    expect(beto.textContent).toContain('Trillar')
    expect(ana.textContent).toContain('Tostar')
  })

  it('tocar "Siguiente paso" avanza ese lote', () => {
    const r = lote({ etapa: 'Empacado' })
    ctx.registros = [r]
    dibujar(<LotesPorEtapa />)
    fireEvent.click(screen.getByRole('button', { name: /Siguiente paso · Entregar/ }))
    expect(ctx.avanzar).toHaveBeenCalledWith(r)
  })

  it('un entregado sin enviar muestra Enviar, no "Siguiente paso"', () => {
    const r = lote({ etapa: 'Entregado', estado: 'Error' })
    ctx.registros = [r]
    dibujar(<LotesPorEtapa />)
    expect(screen.queryByRole('button', { name: /Siguiente paso/ })).toBeNull()
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
