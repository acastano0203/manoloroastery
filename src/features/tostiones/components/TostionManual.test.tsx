// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
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
const api: TostionesApi = { tostiones: [], cargando: false, error: null, ejecutar: async (f) => { await f() }, eliminar: async () => {} }

const tostion = (p: Partial<Tostion> = {}): Tostion => ({
  id: 't', loteId: 'l', origen: 'manual', gramosVerde: 12000, tempCarga: 200, aireInicial: 25, llamaInicial: 100,
  iniciadaAt: null, secadoSeg: null, crackSeg: null, descargaSeg: null, notas: null, archivo: null, creadaAt: '2026-10-19T10:00:00Z', lecturas: [], ...p,
})

const dibujar = (t: Tostion, editable = true) => render(<TostionManual r={r} t={t} numero={1} editable={editable} api={api} />)

afterEach(() => { cleanup(); vi.clearAllMocks() })

describe('Curva manual', () => {
  it('registra el minuto con la temperatura del grano; aire y llama siguen como arrancaron', async () => {
    dibujar(tostion())
    expect(screen.queryByLabelText('Temp. tambor')).toBeNull()
    fireEvent.change(screen.getByLabelText('Temp. grano'), { target: { value: '120,5' } })
    fireEvent.click(screen.getByRole('button', { name: 'Registrar minuto 0' }))
    await waitFor(() => expect(servicio.guardarLectura).toHaveBeenCalledWith('t',
      { segundo: 0, tempGrano: 120.5, tempTambor: null, aire: 25, llama: 100 }))
    // Sin cronómetro, pasa solo al minuto siguiente
    expect(await screen.findByRole('button', { name: 'Registrar minuto 1' })).toBeTruthy()
  })

  it('se puede cambiar la llama y el aire de ese minuto con un toque', async () => {
    dibujar(tostion({ lecturas: [{ id: 'a', segundo: 0, tempGrano: 200, tempTambor: null, aire: 25, llama: 100 }] }))
    const llama = screen.getByRole('group', { name: 'Llama' })
    fireEvent.click(within(llama).getByRole('button', { name: '30%' }))
    const aire = screen.getAllByRole('group', { name: 'Aire' })[0]
    fireEvent.click(within(aire).getByRole('button', { name: '75%' }))
    fireEvent.change(screen.getByLabelText('Temp. grano'), { target: { value: '105' } })
    fireEvent.click(screen.getByRole('button', { name: 'Registrar minuto 1' }))
    await waitFor(() => expect(servicio.guardarLectura).toHaveBeenCalledWith('t',
      { segundo: 60, tempGrano: 105, tempTambor: null, aire: 75, llama: 30 }))
  })

  it('pide la temperatura del grano', () => {
    dibujar(tostion())
    fireEvent.click(screen.getByRole('button', { name: 'Registrar minuto 0' }))
    expect(screen.getByText('Escribe la temperatura del grano.')).toBeTruthy()
    expect(servicio.guardarLectura).not.toHaveBeenCalled()
  })

  it('con el cronómetro andando registra solo cuando marca el minuto', async () => {
    vi.useFakeTimers()
    try {
      vi.setSystemTime(new Date('2026-10-19T10:04:58Z'))
      dibujar(tostion({ iniciadaAt: '2026-10-19T10:00:00Z' }))
      expect(screen.queryByRole('button', { name: /Registrar minuto/ })).toBeNull()
      expect(screen.getByText('5:00')).toBeTruthy()
      fireEvent.change(screen.getByLabelText('Temp. grano'), { target: { value: '150' } })
      await act(() => vi.advanceTimersByTimeAsync(3000))
      expect(servicio.guardarLectura).toHaveBeenCalledWith('t',
        { segundo: 300, tempGrano: 150, tempTambor: null, aire: 25, llama: 100 })
      expect((screen.getByLabelText('Temp. grano') as HTMLInputElement).value).toBe('')
      // Si no se escribe nada, el minuto siguiente no se registra
      await act(() => vi.advanceTimersByTimeAsync(60_000))
      expect(servicio.guardarLectura).toHaveBeenCalledTimes(1)
    } finally {
      vi.useRealTimers()
    }
  })

  it('con el cronómetro andando marca el primer crack en el tiempo transcurrido', async () => {
    const hace = new Date(Date.now() - (8 * 60 + 15) * 1000).toISOString()
    dibujar(tostion({ iniciadaAt: hace }))
    expect(screen.getByText('8:15')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Minuto 9' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '1er crack' }))
    await waitFor(() => expect(servicio.actualizarTostion).toHaveBeenCalledWith('t',
      expect.objectContaining({ crackSeg: expect.any(Number), descargaSeg: null })))
    const { crackSeg } = vi.mocked(servicio.actualizarTostion).mock.calls[0][1]
    expect(crackSeg).toBeGreaterThanOrEqual(495)
  })

  it('marca el fin de secado; después ya no se puede volver a marcar', async () => {
    const hace = new Date(Date.now() - (4 * 60 + 30) * 1000).toISOString()
    dibujar(tostion({ iniciadaAt: hace }))
    expect(screen.getByRole('button', { name: 'Finalizar curva' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Detener' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Fin de secado' }))
    await waitFor(() => expect(servicio.actualizarTostion).toHaveBeenCalledWith('t',
      expect.objectContaining({ secadoSeg: expect.any(Number), crackSeg: null, descargaSeg: null })))
    expect(vi.mocked(servicio.actualizarTostion).mock.calls[0][1].secadoSeg).toBeGreaterThanOrEqual(270)
    cleanup()
    dibujar(tostion({ iniciadaAt: hace, secadoSeg: 270 }))
    expect((screen.getByRole('button', { name: 'Fin de secado' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('muestra secado, Maillard y desarrollo como % del tiempo total', () => {
    // secado 4:00, crack 8:00, fin de curva 10:00
    dibujar(tostion({ iniciadaAt: '2026-10-19T10:00:00Z', secadoSeg: 240, crackSeg: 480, descargaSeg: 600 }))
    const fases = within(screen.getByLabelText('Fases respecto al tiempo total'))
    expect(fases.getAllByText('40,0 %')).toHaveLength(2)
    expect(fases.getByText('20,0 %')).toBeTruthy()
    expect(fases.getAllByText('4:00')).toHaveLength(2)
    expect(fases.getByText('2:00')).toBeTruthy()
  })

  it('al marcar el 1er crack arranca un segundo cronómetro desde el crack', () => {
    const hace = new Date(Date.now() - (9 * 60 + 30) * 1000).toISOString()
    dibujar(tostion({ iniciadaAt: hace, crackSeg: 8 * 60 }))
    expect(screen.getByText('Desde el 1er crack')).toBeTruthy()
    expect(screen.getByText('1:30')).toBeTruthy()
  })

  it('cuando el lote ya pasó de Tostado solo se consulta', () => {
    dibujar(tostion({ lecturas: [{ id: 'a', segundo: 0, tempGrano: 200, tempTambor: null, aire: 25, llama: 100 }] }), false)
    expect(screen.queryByRole('button', { name: /Registrar minuto/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /Borrar lectura/ })).toBeNull()
    expect(screen.getByRole('button', { name: /Descargar reporte PDF/ })).toBeTruthy()
    expect(screen.getByRole('table')).toBeTruthy()
  })
})
