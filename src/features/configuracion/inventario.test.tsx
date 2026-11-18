import { describe, expect, it } from 'vitest'
import { nivel, quedanTxt } from './inventario'

describe('Inventario de bolsas en Siigo', () => {
  it('avisa con 50 o menos, y cuando se acaban', () => {
    expect(nivel(null)).toBe('sin')
    expect(nivel(51)).toBe('ok')
    expect(nivel(50)).toBe('bajo')
    expect(nivel(0)).toBe('agotado')
    expect(nivel(-3)).toBe('agotado')
    expect(quedanTxt(-3)).toBe('Faltan 3')
    expect(quedanTxt(0)).toBe('Agotado')
    expect(quedanTxt(42)).toBe('Quedan 42')
  })
})
