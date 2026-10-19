// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { hoyISO } from '../../../lib/format'
import type { Registro } from '../types'
import { Historial } from './Historial'

const ctx = { registros: [] as Registro[], reabrir: vi.fn(async () => {}) }
vi.mock('../hooks/useRegistros', () => ({ useRegistros: () => ctx }))

const lote = (i: number): Registro => ({
  id: `id-${i}`, codigo: `L-${String(i).padStart(4, '0')}`, cliente: `Cliente ${i}`, fecha: hoyISO(), etapa: 'Entregado', estado: 'Enviado',
  gramos: 1000, n340: 0, n500: 0, n2500: 0, nDrip: 0, pago: 'Efectivo', almacenamiento: null,
  precios: { lb: 3000, p340: 0, p500: 0, p2500: 0, pDrip: 0 },
}) as unknown as Registro

const dibujar = () => render(<MemoryRouter><Historial /></MemoryRouter>)
afterEach(() => { cleanup(); vi.clearAllMocks() })

describe('Historial', () => {
  it('muestra 10 por página y pasa a la siguiente', () => {
    ctx.registros = Array.from({ length: 23 }, (_, i) => lote(i + 1))
    dibujar()
    expect(screen.getByText('Mostrando 1–10 de 23 lotes')).toBeTruthy()
    // El más nuevo primero (mismo día: por código)
    expect(screen.getAllByRole('link', { name: 'Cliente 23' }).length).toBeGreaterThan(0)
    fireEvent.click(screen.getByRole('button', { name: 'Página 3' }))
    expect(screen.getByText('Mostrando 21–23 de 23 lotes')).toBeTruthy()
    expect(screen.getAllByRole('link', { name: 'Cliente 1' }).length).toBeGreaterThan(0)
    expect((screen.getByRole('button', { name: 'Página siguiente' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('buscar vuelve a la primera página', () => {
    ctx.registros = Array.from({ length: 23 }, (_, i) => lote(i + 1))
    dibujar()
    fireEvent.click(screen.getByRole('button', { name: 'Página 2' }))
    fireEvent.change(screen.getByLabelText('Buscar por cliente o código de lote'), { target: { value: 'L-0005' } })
    expect(screen.getByText('Mostrando 1–1 de 1 lote')).toBeTruthy()
  })

  it('reabrir pide confirmación y devuelve el lote al tablero', async () => {
    const r = lote(1)
    ctx.registros = [r]
    dibujar()
    fireEvent.click(screen.getAllByRole('button', { name: /Reabrir/ })[0])
    const dialogo = screen.getByRole('alertdialog', { name: /Reabrir L-0001/ })
    expect(within(dialogo).getByText(/enviarlo otra vez/)).toBeTruthy()
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Sí, reabrir' }))
    await waitFor(() => expect(ctx.reabrir).toHaveBeenCalledWith(r))
  })

  it('cancelar no reabre', () => {
    ctx.registros = [lote(1)]
    dibujar()
    fireEvent.click(screen.getAllByRole('button', { name: /Reabrir/ })[0])
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(ctx.reabrir).not.toHaveBeenCalled()
  })
})
