import { Link } from 'react-router-dom'
import { buttonClass } from '../components/ui/buttonClass'
import { Icon } from '../components/ui/Icon'
import { Loading } from '../components/ui/Loading'
import { PageHeading } from '../components/ui/PageHeading'
import { AvisoRegistros } from '../features/registros/components/AvisoRegistros'
import { Historial } from '../features/registros/components/Historial'
import { HoyResumen } from '../features/registros/components/HoyResumen'
import { LotesPorEtapa } from '../features/registros/components/LotesPorEtapa'
import { useRegistros } from '../features/registros/hooks/useRegistros'

export function RegistrosPage() {
  const { cargando } = useRegistros()
  return (
    <>
      <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-7 px-4 pb-10 pt-6 md:px-6 md:pb-28">
        <PageHeading
          title="Registros"
          action={
            <div className="hidden md:block">
              <Link to="/nuevo" className={buttonClass('primary', 'lg', 'px-6 text-[17px]')}>
                <Icon name="mas" />
                Nuevo lote
              </Link>
            </div>
          }
        />
        <AvisoRegistros />
        {cargando ? <Loading /> : (
          <>
            <HoyResumen />
            <LotesPorEtapa />
            <Historial />
          </>
        )}
      </main>
      <div className="sticky bottom-0 border-t border-arena bg-crema px-4 pb-4 pt-3 md:hidden">
        <Link to="/nuevo" className={buttonClass('primary', 'xxl', 'w-full font-bold')}>
          <Icon name="mas" size={24} />
          Nuevo lote
        </Link>
      </div>
    </>
  )
}
