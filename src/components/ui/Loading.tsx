export function Loading({ texto = 'Cargando…' }: { texto?: string }) {
  return (
    <div role="status" className="flex flex-1 items-center justify-center p-10 text-cafe-suave">
      <span className="mr-3 h-5 w-5 animate-spin rounded-full border-2 border-dorado border-t-transparent" />
      {texto}
    </div>
  )
}
