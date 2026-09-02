import { useState } from 'react'
import Card from '../components/Card'
import {
  MessageIcon,
  PanelLeftIcon,
  RefreshIcon,
  TrendingUpIcon,
  UsersIcon,
} from '../components/icons'
import Sidebar, { type SidebarNavItem } from '../components/Sidebar'
import StatCard from '../components/StatCard'
import Timeline from '../components/Timeline'
import { historialToTimelineItems } from '../constants/trazabilidad'
import { useHistorial } from '../hooks/useHistorial'
import { colors, fontWeight, textStyles } from '../styles'
import type { AppPage } from '../types'
import { cn } from '../utils/cn'

function Historial({ onNavigate }: { onNavigate: (page: AppPage) => void }) {
  const { data, loading, error, refetch } = useHistorial()
  const [sidebarOpen, setSidebarOpen] = useState(true)

  function handleSelectNavItem(item: SidebarNavItem) {
    if (item.id === 'inicio') onNavigate('home')
    if (item.id === 'bandeja') onNavigate('bandeja')
  }

  const resumen = data?.resumen

  return (
    <div
      style={{ backgroundColor: colors.background.page }}
      className="flex h-screen w-full"
    >
      <div
        style={{ borderColor: colors.background.border }}
        className={cn(
          'shrink-0 overflow-hidden border-r transition-[width] duration-200 ease-in-out',
          sidebarOpen ? 'w-[280px]' : 'w-0 border-r-0',
        )}
      >
        <Sidebar
          logoText="S"
          logoColor={colors.primary.dark}
          logoBackground={colors.primary.lightest}
          title="API Errores Softland"
          subtitle="Softland · Errores"
          titleColor={colors.gray.darkest}
          subtitleColor={colors.gray.medium}
          backgroundColor={colors.background.surface}
          dividerColor={colors.background.border}
          sectionTitleColor={colors.gray.default}
          itemColor={colors.gray.dark}
          itemHoverBackground={colors.background.page}
          itemActiveColor={colors.primary.dark}
          itemActiveBackground={colors.primary.lightest}
          activeItem="historial"
          onItemSelect={handleSelectNavItem}
          user={
            data
              ? {
                  name: data.currentUser.nombre,
                  role: data.currentUser.rol,
                  avatarText: data.currentUser.avatarIniciales,
                  avatarColor: colors.primary.dark,
                  avatarBackground: colors.primary.lightest,
                }
              : undefined
          }
        />
      </div>

      <main className="flex-1 overflow-y-auto p-xl">
        <div className="mx-auto flex max-w-[1000px] flex-col gap-xl">
          <div className="flex items-start gap-md">
            <button
              type="button"
              onClick={() => setSidebarOpen((open) => !open)}
              aria-label={sidebarOpen ? 'Ocultar menú' : 'Mostrar menú'}
              aria-expanded={sidebarOpen}
              style={{
                color: colors.gray.medium,
                backgroundColor: colors.background.surface,
              }}
              className="mt-xs flex h-9 w-9 shrink-0 items-center justify-center rounded-md shadow-md transition-colors hover:bg-background-page"
            >
              <PanelLeftIcon className="h-5 w-5" />
            </button>
            <div className="flex flex-col gap-xxs">
              <h1 style={{ ...textStyles.h1, color: colors.gray.darkest }}>
                Historial
              </h1>
              <p style={{ ...textStyles.body, color: colors.gray.medium }}>
                Resumen de lo corregido y trabajado
                {resumen ? ` · ${resumen.periodo.toLowerCase()}` : ''}.
              </p>
            </div>
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
                  <div className="mb-lg flex items-baseline gap-sm">
                    <span
                      style={{ ...textStyles.h3, color: colors.gray.darkest }}
                    >
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
        </div>
      </main>
    </div>
  )
}

export default Historial
