import { describe, expect, it } from 'vitest'
import { formVacio, validarRegistro } from './formulario'

const recibido = { ...formVacio(), clienteId: 'c', cliente: 'Ana', celular: '3001234567', pago: 'Efectivo' as const, kilos: '12,5' }

describe('Validación del lote', () => {
  it('al recibir no pide el café a tostar', () => {
    expect(validarRegistro(recibido)).toEqual({})
  })

  it('si el lote ya se tostó, el peso en almendra es obligatorio', () => {
    expect(validarRegistro(recibido, true).gramos).toBe('Escribe el peso en almendra.')
    expect(validarRegistro({ ...recibido, gramos: '0' }, true).gramos).toBe('Solo números mayores que 0.')
    expect(validarRegistro({ ...recibido, gramos: '3.500' }, true)).toEqual({})
  })

  it('la humedad es opcional, pero si se escribe debe ser un porcentaje', () => {
    expect(validarRegistro({ ...recibido, humedad: '11,5' })).toEqual({})
    expect(validarRegistro({ ...recibido, humedad: '120' }).humedad).toContain('entre 0 y 100')
    expect(validarRegistro({ ...recibido, humedad: 'abc' }).humedad).toContain('entre 0 y 100')
  })

  it('la densidad es opcional, pero si se escribe debe ser g/L válidos', () => {
    expect(validarRegistro({ ...recibido, densidad: '712,5' })).toEqual({})
    expect(validarRegistro({ ...recibido, densidad: '0' }).densidad).toContain('gramos por litro')
    expect(validarRegistro({ ...recibido, densidad: 'abc' }).densidad).toContain('gramos por litro')
  })
})
