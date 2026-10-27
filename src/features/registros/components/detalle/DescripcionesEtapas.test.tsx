// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import * as servicio from '../../services/registrosService'
import type { Registro } from '../../types'
import { DescripcionesEtapas } from './DescripcionesEtapas'

const recargar = vi.fn(async () => {})
vi.mock('../../hooks/useRegistros', () => ({ useRegistros: () => ({ recargar }) }))
const permisos = { todos: true }
vi.mock('../../../admin/hooks/usePermisos', () => ({ usePermisos: () => ({ puede: () => permisos.todos }) }))
vi.mock('../../services/registrosService', () => ({ guardarDescripciones: vi.fn(async () => {}) }))

const lote = (p: Partial<Registro>) =>
  ({ id: 'x', etapa: 'Trillado', llegada: 'Pergamino', descripciones: {}, fechasEtapas: {}, ...p }) as Registro

afterEach(() => { cleanup(); vi.clearAllMocks(); permisos.todos = true })

describe('Descripción por etapa', () => {
  it('no se puede escribir sin pulsar Editar; se guarda con el botón Guardar', async () => {
    render(<DescripcionesEtapas r={lote({ descripciones: { Recibido: 'Costal de fique' } })} />)
    expect(screen.queryByRole('textbox')).toBeNull()
    expect(screen.getByText('Costal de fique')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Editar descripción de la trilla' }))
    const guardar = screen.getByRole('button', { name: 'Guardar' }) as HTMLButtonElement
    expect(guardar.disabled).toBe(true)
    fireEvent.change(screen.getByLabelText(/Descripción de la trilla/), { target: { value: 'Salió parejo' } })
    fireEvent.click(guardar)
    await waitFor(() => expect(servicio.guardarDescripciones).toHaveBeenCalledWith('x',
      { Recibido: 'Costal de fique', Trillado: 'Salió parejo' }))
    await waitFor(() => expect(screen.queryByRole('textbox')).toBeNull())
  })

  it('muestra cuándo llegó a cada etapa', () => {
    const recibido = new Date(2026, 9, 27, 9, 15).toISOString()
    const trillado = new Date(2026, 9, 29, 15, 40).toISOString()
    render(<DescripcionesEtapas r={lote({ fechasEtapas: { Recibido: recibido, Trillado: trillado } })} />)
    expect(screen.getByText(/^Recibido el 27 oct · 9:15/)).toBeTruthy()
    expect(screen.getByText(/^Trillado el 29 oct · 3:40/)).toBeTruthy()
  })

  it('Cancelar no guarda', () => {
    render(<DescripcionesEtapas r={lote({})} />)
    fireEvent.click(screen.getByRole('button', { name: 'Editar descripción de la trilla' }))
    fireEvent.change(screen.getByLabelText(/Descripción de la trilla/), { target: { value: 'Algo' } })
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(servicio.guardarDescripciones).not.toHaveBeenCalled()
    expect(screen.queryByRole('textbox')).toBeNull()
  })

  it('sin permiso solo se ven las descripciones escritas', () => {
    permisos.todos = false
    render(<DescripcionesEtapas r={lote({ descripciones: { Trillado: 'Poca broca' } })} />)
    expect(screen.getByText('Poca broca')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Editar/ })).toBeNull()
    expect(screen.queryByText('Descripción del recibo')).toBeNull()
  })
})
