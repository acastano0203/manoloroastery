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
const config = { id: '1', precios }
vi.mock('../../../configuracion/hooks/useConfig', () => ({ useConfig: () => ({ config }), useConfigOpcional: () => ({ config }) }))
// Bolsas y drips de Siigo, con lo que queda en el inventario de Siigo.
const BOLSAS_SIIGO = [
  { codigo: 'ME05', nombre: 'BOLSA 340GR CON VALVULA', precio: 1500, disponible: 40 },
  { codigo: 'ME15', nombre: 'BOLSA 2500GR CON VALVULA', precio: 4000, disponible: 200 },
  { codigo: 'ME16', nombre: 'BOLSA DRIPBAG', precio: 2500, disponible: 0 },
]
vi.mock('../../../configuracion/hooks/useBolsasSiigo', () => ({
  useBolsasSiigo: () => ({ productos: BOLSAS_SIIGO, error: null, cargando: false, actualizar: vi.fn() }),
}))

const lote = (etapa: Etapa): Registro => ({
  id: 'x', codigo: 'L-0001', clienteId: 'c', fecha: '2026-10-06', cliente: 'Ana', celular: '3001234567', factura: false,
  tipoDoc: 'CC', numDoc: '', correo: '', pago: 'Efectivo', proceso: 'Pergamino', kilos: 20, humedad: 11, densidad: 700,
  gramos: etapa === 'Recibido' || etapa === 'Trillado' ? null : 16000, n340: 1, n500: 0, n2500: 0, nDrip: 0, bolsasCliente: false,
  bolsas: [
    { codigo: 'ME05', nombre: 'BOLSA 340GR CON VALVULA', cantidad: 2, precio: 1500 },
    { codigo: 'ME15', nombre: 'BOLSA 2500GR CON VALVULA', cantidad: 1, precio: 4000 },
    { codigo: 'ME16', nombre: 'BOLSA DRIPBAG', cantidad: 3, precio: 2500 },
  ],
  gramosTostado: etapa === 'Entregado' ? 13000 : null, estado: 'Pendiente', etapa, llegada: 'Pergamino', precios, entregadoAt: null, reabiertoAt: null, siigoFactura: null, siigoError: null, almacenamiento: null, descripciones: {}, fechasEtapas: {}, presentacion: null, molienda: null, gramosSobrante: null,
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
    // La bolsa de 340 g de antes sigue editable; las de Siigo muestran lo que queda en Siigo.
    expect(screen.getByRole('button', { name: 'Agregar bolsa 340 g' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Agregar bolsa 340gr con valvula' })).toBeTruthy()
    expect(screen.getByText('Quedan 40 en Siigo · por agotarse')).toBeTruthy()
    expect(screen.getByText('Quedan 200 en Siigo')).toBeTruthy()
    expect(screen.getByText('Agotado en Siigo')).toBeTruthy()
  })

  it('en Tostado se edita el peso en almendra; la recepción queda bloqueada', () => {
    expect(camposEditables('Tostado')).toEqual(['codigo', 'cliente', 'celular', 'gramos'])
    expect(screen.getByText('Datos de etapas anteriores')).toBeTruthy()
    expect(screen.getByText('20 kg')).toBeTruthy()
    expect(screen.getByText('1 × 340 g · 2 × BOLSA 340GR CON VALVULA · 1 × BOLSA 2500GR CON VALVULA · 3 × BOLSA DRIPBAG')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Agregar bolsa 340 g' })).toBeNull()
  })

  it('en Entregado (sin enviar) se corrigen las bolsas: las de antes se avisan para elegirlas de Siigo', () => {
    camposEditables('Entregado')
    expect(screen.getByRole('alert').textContent).toContain('bolsas de antes de Siigo')
    expect(screen.getByRole('button', { name: 'Quitar bolsa 340 g' })).toBeTruthy()
    expect(screen.getByLabelText('Agregar bolsa o drip de Siigo')).toBeTruthy()
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
