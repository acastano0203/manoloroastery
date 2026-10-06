import { describe, expect, it } from 'vitest'
import { etapaAnterior, etapasDe, siguienteEtapa } from './etapas'

describe('etapas del lote', () => {
  it('pergamino pasa por todas las etapas', () => {
    expect(etapasDe({ llegada: 'Pergamino' })).toEqual(['Recibido', 'Trillado', 'Tostado', 'Empacado', 'Entregado'])
    expect(siguienteEtapa({ llegada: 'Pergamino', etapa: 'Recibido' })).toBe('Trillado')
    expect(siguienteEtapa({ llegada: 'Pergamino', etapa: 'Trillado' })).toBe('Tostado')
    expect(siguienteEtapa({ llegada: 'Pergamino', etapa: 'Empacado' })).toBe('Entregado')
  })

  it('café verde se salta la trilla', () => {
    expect(etapasDe({ llegada: 'Verde' })).not.toContain('Trillado')
    expect(siguienteEtapa({ llegada: 'Verde', etapa: 'Recibido' })).toBe('Tostado')
    expect(etapaAnterior({ llegada: 'Verde', etapa: 'Tostado' })).toBe('Recibido')
  })

  it('sin dato de llegada (registros viejos) se toma como pergamino', () => {
    expect(siguienteEtapa({ llegada: null, etapa: 'Recibido' })).toBe('Trillado')
  })

  it('no hay paso después de Entregado ni antes de Recibido', () => {
    expect(siguienteEtapa({ llegada: 'Pergamino', etapa: 'Entregado' })).toBeNull()
    expect(etapaAnterior({ llegada: 'Pergamino', etapa: 'Recibido' })).toBeNull()
    expect(etapaAnterior({ llegada: 'Pergamino', etapa: 'Entregado' })).toBe('Empacado')
  })

  it('si cambió a Verde estando en Trillado, igual sabe seguir y volver', () => {
    expect(siguienteEtapa({ llegada: 'Verde', etapa: 'Trillado' })).toBe('Tostado')
    expect(etapaAnterior({ llegada: 'Verde', etapa: 'Trillado' })).toBe('Recibido')
  })
})
