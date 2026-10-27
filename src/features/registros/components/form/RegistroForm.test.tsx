// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Etapa, Registro } from '../../types'
import { RegistroForm } from './RegistroForm'

const precios = { lb: 3000, p340: 1500, p500: 1800, p2500: 4000, pDrip: 2500 }
const ctx = { registros: [] as Registro[], cargando: false, recargar: vi.fn(), setAviso: vi.fn() }
vi.mock('../../hooks/useRegistros', () => ({ useRegistros: () => ctx }))
vi.mock('../../../clientes/hooks/useClientes', () => ({ useClientes: () => ({ clientes: [], crear: vi.fn(), actualizar: vi.fn() }) }))
const config = { id: '1', precios, siigoUsuario: '', inventario: { n340: 40, n500: null, n2500: 200, nDrip: 0 } }
vi.mock('../../../configuracion/hooks/useConfig', () => ({ useConfig: () => ({ config }), useConfigOpcional: () => ({ config }) }))

const lote = (etapa: Etapa): Registro => ({
  id: 'x', codigo: 'L-0001', clienteId: 'c', fecha: '2026-10-06', cliente: 'Ana', celular: '3001234567', factura: false,
  tipoDoc: 'CC', numDoc: '', correo: '', pago: 'Efectivo', proceso: 'Pergamino', kilos: 20, humedad: 11, densidad: 700,
  gramos: etapa === 'Recibido' || etapa === 'Trillado' ? null : 16000, n340: 1, n500: 0, n2500: 0, nDrip: 0, bolsasCliente: false,
  gramosTostado: etapa === 'Entregado' ? 13000 : null, estado: 'Pendiente', etapa, llegada: 'Pergamino', precios, entregadoAt: null, reabiertoAt: null, almacenamiento: null, descripciones: {}, fechasEtapas: {}, presentacion: null, molienda: null, gramosSobrante: null,
})

/** ids de los campos de texto que se pueden escribir en el formulario de edición. */
function camposEditables(etapa: Etapa) {
  ctx.registros = [lote(etapa)]
  render(<MemoryRouter><RegistroForm registroId="x" /></MemoryRouter>)
  return screen.queryAllByRole('textbox').map((e) => e.id)
}

afterEach(cleanup)

describe('Editar un lote: solo los datos de su etapa', () => {
  it('en Recibido se editan los datos de recepción', () => {
    expect(camposEditables('Recibido')).toEqual(['codigo', 'cliente', 'celular', 'kilos', 'humedad', 'densidad', 'descripcion'])
    expect(screen.queryByText('Datos de etapas anteriores')).toBeNull()
    expect(screen.getByRole('button', { name: 'Agregar bolsa 340 g' })).toBeTruthy()
    // Lo que queda en bodega: 340 g se está acabando, 500 g no lleva inventario, drips agotados.
    expect(screen.getByText('Quedan 40 en bodega · por agotarse')).toBeTruthy()
    expect(screen.getByText('Quedan 200 en bodega')).toBeTruthy()
    expect(screen.getByText('Agotado en bodega')).toBeTruthy()
    expect(screen.getAllByText(/en bodega/)).toHaveLength(3)
  })

  it('en Tostado se edita el peso en almendra; la recepción queda bloqueada', () => {
    expect(camposEditables('Tostado')).toEqual(['codigo', 'cliente', 'celular', 'gramos'])
    expect(screen.getByText('Datos de etapas anteriores')).toBeTruthy()
    expect(screen.getByText('20 kg')).toBeTruthy()
    expect(screen.getByText('1 × 340 g')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Agregar bolsa 340 g' })).toBeNull()
  })

  it('en Empacado se edita el empaque; el peso en almendra queda bloqueado', () => {
    expect(camposEditables('Empacado')).toEqual(['codigo', 'cliente', 'celular', 'gramosTostado', 'gramosSobrante'])
    expect(screen.getByText('16 kg')).toBeTruthy()
  })

  it('en Entregado solo se editan el nombre del lote y los datos del cliente', () => {
    expect(camposEditables('Entregado')).toEqual(['codigo', 'cliente', 'celular'])
    expect(screen.getByText('13 kg')).toBeTruthy()
  })
})
