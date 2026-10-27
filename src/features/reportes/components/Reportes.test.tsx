// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { NavMenu } from '../../../components/layout/NavMenu'
import { hoyISO } from '../../../lib/format'
import type { Registro } from '../../registros/types'
import { Reportes } from './Reportes'

const ctx = { registros: [] as Registro[], cargando: false }
vi.mock('../../registros/hooks/useRegistros', () => ({ useRegistros: () => ctx }))
const permisos = { lista: ['reportes'] as string[] }
vi.mock('../../admin/hooks/usePermisos', () => ({
  usePermisos: () => ({ puede: (p: string) => permisos.lista.includes(p), veLotes: false, esAdmin: false }),
}))

let n = 0
const lote = (p: Partial<Registro>): Registro => ({
  id: `id-${++n}`, codigo: `L-${String(n).padStart(4, '0')}`, clienteId: 'c', fecha: hoyISO(), cliente: `Cliente ${n}`,
  celular: '3001234567', factura: false, tipoDoc: 'CC', numDoc: '', correo: '', pago: null, proceso: 'Pergamino',
  kilos: 10, humedad: null, densidad: null, gramos: null, n340: 0, n500: 0, n2500: 0, nDrip: 0, bolsasCliente: false, gramosTostado: null,
  gramosSobrante: null, estado: 'Pendiente', etapa: 'Recibido', llegada: 'Pergamino',
  precios: { lb: 3000, p340: 1500, p500: 1800, p2500: 4000, pDrip: 2500 }, entregadoAt: null, reabiertoAt: null, almacenamiento: null,
  descripciones: {}, fechasEtapas: {}, presentacion: null, molienda: null, ...p,
})

const tarjeta = (titulo: string) => screen.getByText(titulo).parentElement as HTMLElement

afterEach(() => { cleanup(); permisos.lista = ['reportes'] })

describe('Reportes', () => {
  it('muestra lo que falta por tostar y los lotes más atrasados', () => {
    ctx.registros = [
      lote({ cliente: 'Ana', kilos: 20, fecha: hoyISO(-12) }),
      lote({ cliente: 'Beto', kilos: 8, etapa: 'Trillado', fecha: hoyISO(-3) }),
      lote({ cliente: 'Caro', kilos: 6, etapa: 'Tostado', gramos: 5000 }),
    ]
    render(<MemoryRouter><Reportes /></MemoryRouter>)
    expect(within(tarjeta('Falta por tostar')).getByText('28 kg')).toBeTruthy()
    expect(within(tarjeta('Por trillar')).getByText('20 kg')).toBeTruthy()
    expect(screen.getByText(/se recibió hace/).textContent).toContain('12 días')
    const filas = within(screen.getAllByRole('table')[0]).getAllByRole('row')
    expect(filas[1].textContent).toContain('Ana')
    // Sin permiso para ver lotes, el código no es un enlace.
    expect(within(filas[1]).queryByRole('link')).toBeNull()
  })

  it('el período cambia los totales', () => {
    ctx.registros = [lote({ kilos: 10 }), lote({ kilos: 30, fecha: hoyISO(-60) })]
    render(<MemoryRouter><Reportes /></MemoryRouter>)
    expect(within(tarjeta('Kilos recibidos')).getByText('10 kg')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Últimos 3 meses' }))
    expect(within(tarjeta('Kilos recibidos')).getByText('40 kg')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Ver como tabla' }))
    expect(screen.getAllByRole('table')).toHaveLength(3)
  })

  it('Reportes aparece en el menú solo con el permiso', () => {
    render(<MemoryRouter><NavMenu /></MemoryRouter>)
    expect(screen.getByRole('link', { name: 'Reportes' })).toBeTruthy()
    cleanup()
    permisos.lista = ['clientes']
    render(<MemoryRouter><NavMenu /></MemoryRouter>)
    expect(screen.queryByRole('link', { name: 'Reportes' })).toBeNull()
  })
})
