import { Button } from '../../../components/ui/Button'
import { buttonClass } from '../../../components/ui/buttonClass'
import { Icon } from '../../../components/ui/Icon'
import type { RemisionApi } from '../hooks/useRemision'

/** Escritorio: botones bajo la vista previa. Celular: barra fija abajo. */
export function CompartirAcciones({ rem, celularTxt }: { rem: RemisionApi; celularTxt: string }) {
  return (
    <>
      <div className="hidden flex-col gap-3 md:flex">
        <a href={rem.pdfHref} download={rem.pdfName} onClick={rem.compartir}
          className="flex min-h-[68px] flex-col items-center justify-center gap-0.5 rounded-xl bg-esmeralda px-4 py-2 text-center text-white no-underline hover:bg-esmeralda-oscuro">
          <span className="flex items-center gap-2.5 text-lg font-bold">
            <Icon name="whatsapp" />
            Descargar PDF y abrir WhatsApp
          </span>
          <span className="text-sm opacity-90">Chat de {celularTxt}</span>
        </a>
        <Button variant="outline" onClick={rem.copiar}>Copiar texto</Button>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-10 grid grid-cols-[1fr_2fr] gap-2 border-t border-verde-salvia bg-white px-4 pb-4 pt-3 md:hidden">
        <Button variant="outline" size="xxl" onClick={rem.copiar}>Copiar texto</Button>
        <a href={rem.pdfHref} download={rem.pdfName} onClick={rem.compartir}
          className={buttonClass('primary', 'xxl', 'text-base font-bold leading-tight')}>
          <Icon name="whatsapp" />
          Descargar y enviar
        </a>
      </div>
    </>
  )
}
