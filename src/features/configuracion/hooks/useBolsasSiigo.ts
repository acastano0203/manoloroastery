import { useCallback, useEffect, useState } from 'react'
import { mensajeError } from '../../../lib/errores'
import { listarBolsasSiigo, type ProductoBolsa } from '../services/siigoService'

// Una sola consulta a Siigo para toda la app: recibir y empacar usan la misma lista.
// Se vuelve a pedir si pasaron más de 5 minutos (el inventario de Siigo cambia) o al pulsar «Actualizar».
const VIGENCIA = 5 * 60_000
let cache: { productos: ProductoBolsa[]; at: number } | null = null
let enCurso: Promise<ProductoBolsa[]> | null = null

function pedir(forzar = false): Promise<ProductoBolsa[]> {
  if (!forzar && cache && Date.now() - cache.at < VIGENCIA) return Promise.resolve(cache.productos)
  if (!enCurso) {
    enCurso = listarBolsasSiigo()
      .then((productos) => {
        cache = { productos, at: Date.now() }
        return productos
      })
      .finally(() => { enCurso = null })
  }
  return enCurso
}

/** Bolsas y drips de Siigo (productos con inventario), con su precio y cuántas hay. */
export function useBolsasSiigo() {
  const [productos, setProductos] = useState<ProductoBolsa[] | null>(cache?.productos ?? null)
  const [error, setError] = useState<string | null>(null)
  const [cargando, setCargando] = useState(false)

  const cargar = useCallback(async (forzar = false) => {
    setCargando(true)
    setError(null)
    try {
      setProductos(await pedir(forzar))
    } catch (e) {
      setError(mensajeError(e))
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    void cargar()
  }, [cargar])

  return { productos, error, cargando, actualizar: () => cargar(true) }
}
