const th = 'px-5 py-3.5 font-semibold'

export function TablaEncabezado({ ultima }: { ultima: string }) {
  return (
    <thead>
      <tr className="bg-crema-claro text-sm text-cafe-medio">
        <th className={th}>Fecha</th>
        <th className={th}>Cliente</th>
        <th className={`${th} text-right`}>Libras</th>
        <th className={`${th} text-right`}>Total</th>
        <th className={th}>Pago</th>
        <th className={th}>Estado</th>
        <th className={`${th} text-right`}>{ultima}</th>
      </tr>
    </thead>
  )
}
