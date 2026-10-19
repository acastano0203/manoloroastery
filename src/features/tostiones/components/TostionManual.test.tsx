// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Registro } from '../../registros/types'
import type { TostionesApi } from '../hooks/useTostiones'
import * as servicio from '../services/tostionesService'
import type { Tostion } from '../types'
import { TostionManual } from './TostionManual'

vi.mock('../services/tostionesService', () => ({
  actualizarTostion: vi.fn(async () => {}), guardarLectura: vi.fn(async () => {}),
  borrarLectura: vi.fn(async () => {}), eliminarTostion: vi.fn(async () => {}),
}))

const r = { id: 'l', codigo: 'L-0007', cliente: 'Ana', proceso: 'Pergamino', fecha: '2026-10-19', gramos: 12000 } as Registro
const api: TostionesApi = { tostiones: [], cargando: false, error: null, ejecutar: async (f) => { await f() } }

const tostion = (p: Partial<Tostion> = {}): Tostion => ({
  id: 't', loteId: 'l', origen: 'manual', gramosVerde: 12000, tempCarga: 200, aireInicial: 25, llamaInicial: 100,
  iniciadaAt: null, crackSeg: null, descargaSeg: null, notas: null, archivo: null, creadaAt: '2026-10-19T10:00:00Z', lecturas: [], ...p,
})

const dibujar = (t: Tostion, editable = true) => render(<TostionManual r={r} t={t} numero={1} editable={editable} api={api} />)

afterEach(() => { cleanup(); vi.clearAllMocks() })

describe('Curva manual', () => {
  it('registra el minuto con las temperaturas; aire y llama siguen como arrancaron', async () => {
    dibujar(tostion())
    fireEvent.change(screen.getByLabelText('Temp. grano'), { target: { value: '120,5' } })
    fireEvent.change(screen.getByLabelText('Temp. tambor'), { target: { value: '190' } })
    fireEvent.click(screen.getByRole('button', { name: 'Registrar minuto 0' }))
    await waitFor(() => expect(servicio.guardarLectura).toHaveBeenCalledWith('t',
      { segundo: 0, tempGrano: 120.5, tempTambor: 190, aire: 25, llama: 100 }))
    // Sin cronómetro, pasa solo al minuto siguiente
    expect(await screen.findByRole('button', { name: 'Registrar minuto 1' })).toBeTruthy()
  })

  it('se puede cambiar la llama y el aire de ese minuto con un toque', async () => {
    dibujar(tostion({ lecturas: [{ id: 'a', segundo: 0, tempGrano: 200, tempTambor: 230, aire: 25, llama: 100 }] }))
    const llama = screen.getByRole('group', { name: 'Llama' })
    fireEvent.click(within(llama).getByRole('button', { name: '30%' }))
    const aire = screen.getAllByRole('group', { name: 'Aire' })[0]
    fireEvent.click(within(aire).getByRole('button', { name: '75%' }))
    fireEvent.change(screen.getByLabelText('Temp. grano'), { target: { value: '105' } })
    fireEvent.click(screen.getByRole('button', { name: 'Registrar minuto 1' }))
    await waitFor(() => expect(servicio.guardarLectura).toHaveBeenCalledWith('t',
      { segundo: 60, tempGrano: 105, tempTambor: null, aire: 75, llama: 30 }))
  })

  it('pide al menos una temperatura', () => {
    dibujar(tostion())
    fireEvent.click(screen.getByRole('button', { name: 'Registrar minuto 0' }))
    expect(screen.getByText('Escribe la temperatura del grano o del tambor.')).toBeTruthy()
    expect(servicio.guardarLectura).not.toHaveBeenCalled()
  })

  it('con el cronómetro andando marca el primer crack en el tiempo transcurrido', async () => {
    const hace = new Date(Date.now() - (8 * 60 + 15) * 1000).toISOString()
    dibujar(tostion({ iniciadaAt: hace }))
    expect(screen.getByText('8:15')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Registrar minuto 8' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '1er crack' }))
    await waitFor(() => expect(servicio.actualizarTostion).toHaveBeenCalledWith('t',
      expect.objectContaining({ crackSeg: expect.any(Number), descargaSeg: null })))
    const { crackSeg } = vi.mocked(servicio.actualizarTostion).mock.calls[0][1]
    expect(crackSeg).toBeGreaterThanOrEqual(495)
  })

  it('muestra desarrollo y DTR con el crack y la descarga', () => {
    dibujar(tostion({ iniciadaAt: '2026-10-19T10:00:00Z', crackSeg: 480, descargaSeg: 600 }))
    expect(screen.getByText('2:00')).toBeTruthy()
    expect(screen.getByText('20,0 %')).toBeTruthy()
  })

  it('cuando el lote ya pasó de Tostado solo se consulta', () => {
    dibujar(tostion({ lecturas: [{ id: 'a', segundo: 0, tempGrano: 200, tempTambor: 230, aire: 25, llama: 100 }] }), false)
    expect(screen.queryByRole('button', { name: /Registrar minuto/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /Borrar lectura/ })).toBeNull()
    expect(screen.getByRole('button', { name: /Descargar reporte PDF/ })).toBeTruthy()
    expect(screen.getByRole('table')).toBeTruthy()
  })
})
