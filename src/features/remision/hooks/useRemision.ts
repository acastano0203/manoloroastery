import { useEffect, useMemo, useState, type MouseEvent } from 'react'
import { cel, fecha, kg, kgDeG, miles, money } from '../../../lib/format'
import type { Registro } from '../../registros/types'
import { BOLSAS, calcularCobro, describirBolsas } from '../../registros/utils'
import { construirPdf } from '../services/pdfService'
import type { DatosRemision, LineaRemision } from '../types'

function datosDe(r: Registro): DatosRemision {
  const cobro = calcularCobro(r, r.precios)
  const lineas: LineaRemision[] = [{ concepto: 'Tostión', detalle: `${cobro.fLibras} = ${cobro.fTostion}`, valor: cobro.tostionTxt }]
  for (const b of BOLSAS) {
    if (r[b.n] > 0) lineas.push({ concepto: b.plural, detalle: `${r[b.n]} × ${money(r.precios[b.p])}`, valor: money(r[b.n] * r.precios[b.p]) })
  }
  // El sobrante va suelto y ya está en la tostión: se lista para que el cliente sepa que se le entrega.
  if (r.gramosSobrante) lineas.push({ concepto: 'Sobrante sin empacar', detalle: `${miles(r.gramosSobrante)} g sueltos`, valor: 'Incluido' })
  return {
    codigo: r.codigo, fechaLarga: fecha(r.fecha, true), cliente: r.cliente, celularTxt: cel(r.celular), proceso: r.proceso,
    kilosTxt: `${kg(r.kilos)} kg`, gramosTxt: `${kgDeG(r.gramos ?? 0)} kg`, pago: r.pago ?? 'Sin dato', cobro, lineas,
  }
}

/** Remisión de un registro: datos, PDF descargable, texto de WhatsApp y acciones para compartir. */
export function useRemision(r: Registro) {
  const datos = useMemo(() => datosDe(r), [r])
  const [aviso, setAviso] = useState<string | null>(null)
  const [fallback, setFallback] = useState(false)

  const texto = `Hola, ${r.cliente}. Te envío en PDF la remisión ${r.codigo} de tu tostión del ${datos.fechaLarga}: ` +
    `${datos.gramosTxt} (${datos.cobro.librasTxt})${datos.cobro.nb ? ' + ' + describirBolsas(r).toLowerCase() : ''}` +
    `${r.gramosSobrante ? ` + ${miles(r.gramosSobrante)} g sueltos (sobrante, incluido en la tostión)` : ''}. ` +
    `Total: ${datos.cobro.totalTxt}, pagado por ${datos.pago}.`
  const pdfName = `Remision-${r.codigo}.pdf`
  const waUrl = `https://wa.me/57${r.celular.replace(/\D/g, '')}?text=${encodeURIComponent(texto)}`

  const archivo = useMemo(() => new File([construirPdf(datos)], pdfName, { type: 'application/pdf' }), [datos, pdfName])
  const [pdfHref, setPdfHref] = useState('')
  useEffect(() => {
    const url = URL.createObjectURL(archivo)
    setPdfHref(url)
    return () => URL.revokeObjectURL(url)
  }, [archivo])

  /** En celular comparte el PDF directo (hoja de compartir). Si no se puede, descarga y abre el chat de WhatsApp. */
  function compartir(e: MouseEvent<HTMLAnchorElement>) {
    if (navigator.canShare?.({ files: [archivo] })) {
      e.preventDefault()
      navigator.share({ files: [archivo], text: texto })
        .then(() => { setAviso('Remisión enviada: PDF con el texto debajo.'); setFallback(false) })
        .catch((err: unknown) => {
          if ((err as Error)?.name === 'AbortError') return
          descargar()
          abrirWhatsApp()
        })
      return
    }
    abrirWhatsApp() // el <a download> descarga el PDF
  }

  function descargar() {
    const a = document.createElement('a')
    a.href = pdfHref
    a.download = pdfName
    a.click()
  }

  function abrirWhatsApp() {
    window.open(waUrl, '_blank', 'noopener')
    setAviso(null)
    setFallback(true)
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto)
      setAviso('Texto de la remisión copiado. Pégalo en el chat del cliente.')
    } catch {
      setAviso('No se pudo copiar. Selecciona el texto y cópialo a mano.')
    }
  }

  return { datos, texto, pdfName, pdfHref, waUrl, aviso, fallback, compartir, copiar }
}

export type RemisionApi = ReturnType<typeof useRemision>
