// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AvisoInventario } from './components/AvisoInventario'
import { cambiosInventario } from './components/InventarioBolsas'
import { alertasInventario, nivel, quedanTxt } from './inventario'
import type { Inventario } from './types'

const ctx = { config: null as { inventario: Inventario } | null }
vi.mock('./hooks/useConfig', () => ({ useConfig: () => ctx }))
const permisos = { lista: ['tablero'] as string[] }
vi.mock('../admin/hooks/usePermisos', () => ({ usePermisos: () => ({ puede: (p: string) => permisos.lista.includes(p) }) }))

afterEach(() => { cleanup(); permisos.lista = ['tablero'] })

describe('Inventario de bolsas', () => {
  it('avisa con 50 o menos, y cuando se acaban', () => {
    expect(nivel(null)).toBe('sin')
    expect(nivel(51)).toBe('ok')
    expect(nivel(50)).toBe('bajo')
    expect(nivel(0)).toBe('agotado')
    expect(nivel(-3)).toBe('agotado')
    expect(quedanTxt(-3)).toBe('Faltan 3')
    expect(alertasInventario({ n340: 120, n500: 50, n2500: null, nDrip: 0 })).toEqual([
      { n: 'n500', nombre: 'Bolsas 500 g', quedan: 50, nivel: 'bajo' },
      { n: 'nDrip', nombre: 'Drips', quedan: 0, nivel: 'agotado' },
    ])
  })

  it('al guardar solo manda las cantidades que se cambiaron', () => {
    const actual: Inventario = { n340: 100, n500: 30, n2500: null, nDrip: 10 }
    // 340 g se escribió igual que estaba; 500 g se contó otra vez; drips se borró (deja de llevar inventario).
    expect(cambiosInventario({ n340: '100', n500: '250', nDrip: '' }, actual)).toEqual({ n500: 250, nDrip: null })
    expect(cambiosInventario({}, actual)).toEqual({})
  })

  it('el tablero avisa qué se está acabando y lleva a Configuración si se puede', () => {
    ctx.config = { inventario: { n340: 42, n500: 300, n2500: null, nDrip: 0 } }
    permisos.lista = ['tablero', 'configuracion']
    render(<MemoryRouter><AvisoInventario /></MemoryRouter>)
    const aviso = screen.getByRole('status')
    expect(aviso.textContent).toContain('Bolsas 340 g (quedan 42)')
    expect(aviso.textContent).toContain('Drips (agotado)')
    expect(aviso.textContent).not.toContain('500 g')
    expect(screen.getByRole('link', { name: 'Actualizar inventario' })).toBeTruthy()
  })

  it('sin nada por acabarse no muestra aviso', () => {
    ctx.config = { inventario: { n340: 51, n500: null, n2500: null, nDrip: null } }
    render(<MemoryRouter><AvisoInventario /></MemoryRouter>)
    expect(screen.queryByRole('status')).toBeNull()
  })
})
