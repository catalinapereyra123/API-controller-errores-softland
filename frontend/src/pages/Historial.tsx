import Card from '../components/Card'
import {
  MessageIcon,
  RefreshIcon,
  TrendingUpIcon,
  UsersIcon,
} from '../components/icons'
import AppLayout from '../components/AppLayout'
import StatCard from '../components/StatCard'
import Timeline from '../components/Timeline'
import { historialToTimelineItems } from '../constants/trazabilidad'
import { useHistorial } from '../hooks/useHistorial'
import { colors, fontWeight, textStyles } from '../styles'
import type { AppPage } from '../types'

function Historial({ onNavigate }: { onNavigate: (page: AppPage) => void }) {
  const { resumen, loading, error, refetch } = useHistorial()

  return (
    <AppLayout
      activeItem="historial"
      onNavigate={onNavigate}
      migas={[{ label: 'Inicio', page: 'home' }, { label: 'Historial' }]}
      maxWidth="1000px"
    >
      <div className="flex flex-col gap-xxs">
        <h1 style={{ ...textStyles.h1, color: colors.gray.darkest }}>
          Historial
        </h1>
        <p style={{ ...textStyles.body, color: colors.gray.medium }}>
          Resumen de lo corregido y trabajado
          {resumen ? ` · ${resumen.periodo.toLowerCase()}` : ''}.
        </p>
      </div>

      {error && (
        <div
          style={{
            ...textStyles.bodySmall,
            fontWeight: fontWeight.semibold,
            backgroundColor: colors.label.red.background,
            color: colors.label.red.text,
            borderColor: colors.label.red.outline,
          }}
          className="flex items-center justify-between gap-md rounded-xl border px-lg py-md"
        >
          {error}
          <button type="button" className="underline" onClick={refetch}>
            Reintentar
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-lg sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Resueltos"
          value={resumen ? resumen.resueltos : '—'}
          labelColor={colors.gray.default}
          valueColor={colors.gray.darkest}
          backgroundColor={colors.background.surface}
          icon={<TrendingUpIcon className="h-5 w-5" />}
          iconColor={colors.label.green.text}
          iconBackground={colors.label.green.background}
          trend={{
            text: 'Cerrados en estado S',
            color: colors.gray.medium,
          }}
        />
        <StatCard
          label="Reprocesos"
          value={resumen ? resumen.reprocesos : '—'}
          labelColor={colors.gray.default}
          valueColor={colors.gray.darkest}
          backgroundColor={colors.background.surface}
          icon={<RefreshIcon className="h-5 w-5" />}
          iconColor={colors.label.blue.text}
          iconBackground={colors.label.blue.background}
          trend={{ text: 'Ejecutados', color: colors.gray.medium }}
        />
        <StatCard
          label="Observaciones"
          value={resumen ? resumen.observaciones : '—'}
          labelColor={colors.gray.default}
          valueColor={colors.gray.darkest}
          backgroundColor={colors.background.surface}
          icon={<MessageIcon className="h-5 w-5" />}
          iconColor={colors.label.purple.text}
          iconBackground={colors.label.purple.background}
          trend={{
            text: 'Cargadas por el equipo',
            color: colors.gray.medium,
          }}
        />
        <StatCard
          label="Reasignaciones"
          value={resumen ? resumen.reasignaciones : '—'}
          labelColor={colors.gray.default}
          valueColor={colors.gray.darkest}
          backgroundColor={colors.background.surface}
          icon={<UsersIcon className="h-5 w-5" />}
          iconColor={colors.label.orange.text}
          iconBackground={colors.label.orange.background}
          trend={{
            text: 'Cambios de responsable',
            color: colors.gray.medium,
          }}
        />
      </div>

      {loading || !resumen ? (
        <Card className="flex items-center justify-center py-xxl">
          <span style={{ ...textStyles.body, color: colors.gray.medium }}>
            Cargando historial…
          </span>
        </Card>
      ) : (
        <div className="flex flex-col gap-lg">
          {resumen.dias.map((dia) => (
            <Card key={dia.id}>
              <div className="sticky top-14 z-10 -mx-lg -mt-lg mb-md flex items-baseline gap-sm rounded-t-xl bg-white/90 px-lg pt-lg pb-sm backdrop-blur-md">
                <span style={{ ...textStyles.h3, color: colors.gray.darkest }}>
                  {dia.etiqueta}
                </span>
                {dia.etiqueta !== dia.fecha && (
                  <span
                    style={{
                      ...textStyles.bodySmall,
                      color: colors.gray.medium,
                    }}
                  >
                    {dia.fecha}
                  </span>
                )}
              </div>

              <Timeline
                items={historialToTimelineItems(dia.eventos)}
                connectorColor={colors.background.border}
                timeColor={colors.gray.default}
                titleColor={colors.gray.darkest}
                descriptionColor={colors.gray.medium}
              />
            </Card>
          ))}
        </div>
      )}
    </AppLayout>
  )
}

export default Historial
