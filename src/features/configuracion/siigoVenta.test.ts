import { describe, expect, it } from 'vitest'
import {
  ajustesDeConfig, armarCliente, armarCotizacion, digitoVerificacion, hoyColombia, identificacion,
  librasDelLote, llaveIdempotencia, partirNombre, productosParaBolsas,
  type AjustesSiigo, type LoteVenta,
} from '../../../supabase/functions/_shared/siigoVenta'

const ajustes: AjustesSiigo & { documentoId: number; vendedorId: number } = {
  ...ajustesDeConfig(null),
  documentoId: 9042, vendedorId: 233,
  direccion: 'Calle 1 # 2-3', departamento: '05', ciudad: '05001',
}

const lote = (p: Partial<LoteVenta> = {}): LoteVenta => ({
  id: '0b6f1c2e-1111-4222-8333-944445555666', codigo: 'L-0013', proceso: 'Pergamino', factura: true, num_doc: '900.123.456-7',
  cliente: 'Ana María Pérez Gómez', celular: '3001234567', correo: 'ana@correo.co', tipo_doc: 'CC',
  pago: 'Efectivo', etapa: 'Entregado', gramos: 16000, gramos_tostado: 13000, precio_lb: 3000,
  bolsas: [
    { codigo: 'ME05', nombre: 'BOLSA 340GR CON VALVULA 4 P', cantidad: 2, precio: 1500 },
    { codigo: 'ME16', nombre: 'BOLSA DRIPBAG', cantidad: 5, precio: 2500 },
  ],
  n340: 0, n500: 0, n2500: 0, n_drip: 0, bolsas_cliente: false, reabierto_at: null, ...p,
})

describe('armarCotizacion', () => {
  it('cotiza la torrefacción por libras y cada bolsa de Siigo con su precio; la forma de pago va en la descripción', () => {
    const v = armarCotizacion(lote(), ajustes, '2026-11-11')
    expect(v.cotizacion.items).toEqual([
      { code: 'STORRE', description: 'Torrefacción lote L-0013 · Pergamino · 26 lb · Pago: Efectivo', quantity: 26, price: 3000 },
      { code: 'ME05', description: 'BOLSA 340GR CON VALVULA 4 P', quantity: 2, price: 1500 },
      { code: 'ME16', description: 'BOLSA DRIPBAG', quantity: 5, price: 2500 },
    ])
    expect(v.total).toBe(26 * 3000 + 3000 + 12500)
    expect(v.cotizacion.document).toEqual({ id: 9042 })
    expect(v.cotizacion.seller).toBe(233)
    expect(v.cotizacion.customer).toEqual({ identification: '900123456', branch_office: 0 })
    expect(v.cotizacion.date).toBe('2026-11-11')
    // Solo los campos que acepta POST /v1/quotations: sin pagos, impuestos ni DIAN.
    expect(Object.keys(v.cotizacion).sort()).toEqual(['customer', 'date', 'document', 'items', 'seller'])
  })

  it('sin bolsas: solo la torrefacción', () => {
    expect(armarCotizacion(lote({ bolsas: [] }), ajustes).cotizacion.items.map((i) => i.code)).toEqual(['STORRE'])
    expect(armarCotizacion(lote({ bolsas: null }), ajustes).cotizacion.items.map((i) => i.code)).toEqual(['STORRE'])
  })

  it('al reemplazar otra cotización lo dice en la descripción', () => {
    expect(armarCotizacion(lote(), ajustes, '2026-11-11', 'C-1-7').cotizacion.items[0].description).toMatch(/Reemplaza C-1-7$/)
  })

  it('libras a 2 decimales (lo máximo que acepta Siigo)', () => {
    const v = armarCotizacion(lote({ gramos_tostado: 1234, bolsas: [] }), ajustes)
    expect(v.cotizacion.items[0].quantity).toBe(2.47)
    expect(v.total).toBe(7410)
  })

  it('sin factura a nombre propio: consumidor final', () => {
    expect(armarCotizacion(lote({ factura: false, num_doc: '' }), ajustes).cotizacion.customer.identification).toBe('222222222222')
  })

  it('no arma la cotización si falta algo (para no mandarle a Siigo algo que va a rechazar)', () => {
    expect(() => armarCotizacion(lote(), { ...ajustes, tostion: '' })).toThrow(/torrefacción/)
    expect(() => armarCotizacion(lote({ etapa: 'Empacado' }), ajustes)).toThrow(/entregados/)
    expect(() => armarCotizacion(lote({ pago: null }), ajustes)).toThrow(/forma de pago/)
    expect(() => armarCotizacion(lote({ num_doc: '' }), ajustes)).toThrow(/número de documento/)
    expect(() => armarCotizacion(lote({ gramos: null, gramos_tostado: null }), ajustes)).toThrow(/libras/)
  })

  it('lotes de antes con bolsas por tamaño: pide elegirlas de Siigo', () => {
    expect(() => armarCotizacion(lote({ n340: 2 }), ajustes)).toThrow(/elígelas otra vez de la lista de Siigo/)
    // «Sin bolsa»: las bolsas de antes no cuentan, los drips sí.
    expect(() => armarCotizacion(lote({ n340: 2, bolsas_cliente: true }), ajustes)).not.toThrow()
    expect(() => armarCotizacion(lote({ n_drip: 1, bolsas_cliente: true }), ajustes)).toThrow(/Siigo/)
  })
})

describe('productos de Siigo para las bolsas', () => {
  it('solo los activos con inventario, con el precio de la lista 1 y lo disponible, por nombre', () => {
    expect(productosParaBolsas([
      { code: 'STORRE', name: 'TORREFACCIÓN' },
      { code: 'ME16', name: 'BOLSA DRIPBAG', stock_control: true, available_quantity: 40, prices: [{ currency_code: 'COP', price_list: [{ position: 1, value: 2500 }] }] },
      { code: 'ME05', name: 'BOLSA 340GR', stock_control: true, available_quantity: 3, prices: [{ price_list: [{ position: 2, value: 9 }, { position: 1, value: 1500 }] }] },
      { code: 'X', name: 'INACTIVO', stock_control: true, active: false },
      { code: 'ME01', name: 'BOLSA 500GR', stock_control: true },
    ])).toEqual([
      { codigo: 'ME05', nombre: 'BOLSA 340GR', precio: 1500, disponible: 3 },
      { codigo: 'ME01', nombre: 'BOLSA 500GR', precio: 0, disponible: 0 },
      { codigo: 'ME16', nombre: 'BOLSA DRIPBAG', precio: 2500, disponible: 40 },
    ])
  })
})

describe('utilidades', () => {
  it('libras como en el cobro: tostado o, si falta, en almendra', () => {
    expect(librasDelLote({ gramos: 16000, gramos_tostado: null })).toBe(32)
    expect(librasDelLote({ gramos: 16000, gramos_tostado: 12999 })).toBe(26)
  })
  it('identificación sin puntos ni dígito de verificación', () => {
    expect(identificacion('900.123.456-7')).toBe('900123456')
    expect(identificacion(' 1 020 304 ')).toBe('1020304')
  })
  it('llave de idempotencia: máximo 30, la misma para el mismo lote y otra al reabrir', () => {
    const k = llaveIdempotencia(lote())
    expect(k).toMatch(/^[a-zA-Z0-9]{1,30}$/)
    expect(llaveIdempotencia(lote())).toBe(k)
    expect(llaveIdempotencia(lote({ reabierto_at: '2026-11-11T15:00:00Z' }))).not.toBe(k)
  })
  it('fecha de hoy en Colombia', () => {
    expect(hoyColombia(new Date('2026-11-12T03:00:00Z'))).toBe('2026-11-11')
  })
  it('lee los ajustes de la configuración: torrefacción STORRE por defecto', () => {
    const vacio = ajustesDeConfig(null)
    expect(vacio.tostion).toBe('STORRE')
    expect(vacio.documentoId).toBeNull()
    expect(vacio.consumidorFinal).toBe('222222222222')
    expect(vacio.crearClientes).toBe(true)
    const a = ajustesDeConfig({ siigo_cotizacion_id: 9042, siigo_vendedor_id: 233, siigo_producto_tostion: ' STORRE2 ' })
    expect(a.documentoId).toBe(9042)
    expect(a.vendedorId).toBe(233)
    expect(a.tostion).toBe('STORRE2')
  })
})

describe('cliente nuevo en Siigo', () => {
  it('persona con CC: nombres y apellidos, celular y correo, dirección de la configuración', () => {
    const c = armarCliente(lote({ num_doc: '1.020.304' }), ajustes)
    expect(c).toMatchObject({
      type: 'Customer', person_type: 'Person', id_type: '13', identification: '1020304',
      name: ['Ana María', 'Pérez Gómez'], fiscal_responsibilities: [{ code: 'R-99-PN' }],
      address: { address: 'Calle 1 # 2-3', city: { country_code: 'Co', state_code: '05', city_code: '05001' } },
      phones: [{ number: '3001234567' }],
      contacts: [{ first_name: 'Ana María', last_name: 'Pérez Gómez', email: 'ana@correo.co' }],
    })
    expect(c.check_digit).toBeUndefined()
  })

  it('empresa con NIT: razón social y dígito de verificación', () => {
    const c = armarCliente(lote({ tipo_doc: 'NIT', cliente: 'Café La Montaña SAS', num_doc: '900.123.456-7' }), ajustes)
    expect(c).toMatchObject({ person_type: 'Company', id_type: '31', identification: '900123456', name: ['Café La Montaña SAS'] })
    expect(c.check_digit).toBe(digitoVerificacion('900123456'))
  })

  it('dígito de verificación de la DIAN', () => {
    expect(digitoVerificacion('900123456')).toBe('8')
    expect(digitoVerificacion('800197268')).toBe('4')
  })

  it('nombre: dos y dos con 4 palabras, si no la primera y el resto', () => {
    expect(partirNombre('Ana María Pérez Gómez')).toEqual(['Ana María', 'Pérez Gómez'])
    expect(partirNombre('Juan Pérez Gómez')).toEqual(['Juan', 'Pérez Gómez'])
    expect(partirNombre('Juan')).toBeNull()
  })

  it('no lo arma si falta la ciudad o el apellido', () => {
    expect(() => armarCliente(lote(), { ...ajustes, ciudad: '' })).toThrow(/ciudad/)
    expect(() => armarCliente(lote({ cliente: 'Juan' }), ajustes)).toThrow(/nombre y apellido/)
  })
})
