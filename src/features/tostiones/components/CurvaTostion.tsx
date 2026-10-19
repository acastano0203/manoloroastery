import { useState } from 'react'
import { Alert } from '../../../components/ui/Alert'
import { Button } from '../../../components/ui/Button'
import { Icon } from '../../../components/ui/Icon'
import { Loading } from '../../../components/ui/Loading'
import { cx } from '../../../lib/cx'
import { usePermisos } from '../../admin/hooks/usePermisos'
import type { Registro } from '../../registros/types'
import { useTostiones } from '../hooks/useTostiones'
import { crearTostionManual } from '../services/tostionesService'
import { TostionManual } from './TostionManual'
import { TostionesAutomaticas } from './TostionesAutomaticas'

type Pestana = 'manual' | 'automatica'

/** Curva de tostión del lote: manual (minuto a minuto) o automática (PDF del software del tostador). */
export function CurvaTostion({ r }: { r: Registro }) {
  const api = useTostiones(r.id)
  const { tostiones, cargando, error } = api
  const { puede } = usePermisos()
  // Se registra mientras el lote está en Tostado (con permiso de curvas); después solo se consulta.
  const editable = r.etapa === 'Tostado' && puede('curvas')
  const [pestana, setPestana] = useState<Pestana>('manual')
  const manuales = tostiones.filter((t) => t.origen === 'manual')
  const [elegida, setElegida] = useState<string | null>(null)
  const actual = manuales.find((t) => t.id === elegida) ?? manuales[manuales.length - 1]

  async function nueva() {
    await api.ejecutar(() => crearTostionManual(r.id, {
      gramosVerde: r.gramos && r.gramos > 0 ? r.gramos : 1,
      // Arranca como terminó el bache anterior, que suele repetirse.
      aireInicial: actual?.aireInicial ?? null, llamaInicial: actual?.llamaInicial ?? null, tempCarga: actual?.tempCarga ?? null,
    }))
    setElegida(null)
  }

  if (!editable && !cargando && tostiones.length === 0) return null

  return (
    <section aria-labelledby="t-curva" className="flex flex-col gap-4 rounded-[14px] border border-linea bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="t-curva" className="m-0 text-xl font-bold">Curva de tostión</h2>
        <div role="tablist" aria-label="Forma de registrar la curva" className="flex rounded-xl bg-rocio-claro p-1">
          {([['manual', 'Manual'], ['automatica', 'Automática (PDF)']] as const).map(([k, texto]) => (
            <button key={k} type="button" role="tab" id={`tab-${k}`} aria-selected={pestana === k} aria-controls={`panel-${k}`}
              onClick={() => setPestana(k)}
              className={cx('h-11 rounded-lg px-4 text-[15px] font-semibold', pestana === k ? 'bg-white text-esmeralda-oscuro shadow-sm' : 'text-pizarra')}>
              {texto}
            </button>
          ))}
        </div>
      </div>

      {error && <Alert kind="error">{error}</Alert>}
      {cargando ? <Loading /> : pestana === 'manual' ? (
        <div role="tabpanel" id="panel-manual" aria-labelledby="tab-manual" className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {manuales.map((t) => (
              <button key={t.id} type="button" aria-pressed={t.id === actual?.id} onClick={() => setElegida(t.id)}
                className={cx('h-11 rounded-full border-2 px-4 text-[15px] font-semibold',
                  t.id === actual?.id ? 'border-esmeralda bg-esmeralda text-white' : 'border-linea-oscuro bg-white text-pizarra')}>
                Bache {tostiones.indexOf(t) + 1}
              </button>
            ))}
            {editable && (
              <Button variant={manuales.length ? 'outline' : 'primary'} size={manuales.length ? 'sm' : 'xl'} onClick={() => void nueva()}
                className={manuales.length ? 'rounded-full' : 'w-full font-bold'}>
                <Icon name="mas" size={20} />
                {manuales.length ? 'Nueva tostión' : 'Empezar curva manual'}
              </Button>
            )}
          </div>
          {actual ? (
            <TostionManual key={actual.id} r={r} t={actual} numero={tostiones.indexOf(actual) + 1} editable={editable} api={api} />
          ) : !editable && <p className="m-0 text-[15px] text-pizarra-suave">No se registró curva manual.</p>}
        </div>
      ) : (
        <div role="tabpanel" id="panel-automatica" aria-labelledby="tab-automatica">
          <TostionesAutomaticas r={r} todas={tostiones} editable={editable} api={api} />
        </div>
      )}
    </section>
  )
}
