interface Props {
  pdfName: string
  texto: string
  celularTxt: string
}

/** Cómo le llega la remisión al cliente por WhatsApp. */
export function WhatsAppVistaPrevia({ pdfName, texto, celularTxt }: Props) {
  return (
    <div className="flex flex-col items-end rounded-[14px] bg-whatsapp p-4">
      <div className="flex w-full max-w-[340px] flex-col gap-2 rounded-[10px] bg-white p-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.12)]">
        <div className="flex items-center gap-3 rounded-lg bg-crema-claro p-3">
          <div className="flex h-12 w-10 shrink-0 items-end justify-center rounded bg-peligro pb-1.5 text-[11px] font-bold text-white">PDF</div>
          <div className="flex min-w-0 flex-col">
            <span className="text-[15px] font-semibold [overflow-wrap:anywhere]">{pdfName}</span>
            <span className="text-[13px] text-cafe-suave">1 página · PDF</span>
          </div>
        </div>
        <div className="whitespace-pre-line px-1.5 pb-1 text-[15px]">{texto}</div>
      </div>
      <div className="mt-1.5 text-xs text-cafe-suave">Para {celularTxt}</div>
    </div>
  )
}
