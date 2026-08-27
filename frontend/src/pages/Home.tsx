import { useState } from 'react'
import Button from '../components/Button'
import ChevronButton from '../components/ChevronButton'
import {
  AlertTriangleIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  ClockIcon,
  InboxIcon,
  PanelLeftIcon,
  RefreshIcon,
  TrendingUpIcon,
  UserIcon,
  UsersIcon,
  XCircleIcon,
} from '../components/icons'
import Sidebar, {
  type SidebarItemId,
  type SidebarNavItem,
} from '../components/Sidebar'
import StatCard from '../components/StatCard'
import Table from '../components/Table'
import { estadoTagByEstado } from '../constants/estados'
import { useHomeData } from '../hooks/useHomeData'
import { colors, fontFamily, fontWeight, spacing, textStyles } from '../styles'
import type { AppPage, Empresa, ErrorTransaccion } from '../types'
import { cn } from '../utils/cn'
import {
  formatElapsedSince,
  formatMinutes,
  formatTodayEs,
} from '../utils/format'
import { empresaLabel } from '../utils/labels'

function ResponsableIndicator({ asignado }: { asignado: boolean }) {
  const color = asignado ? colors.status.success : colors.status.error

  return (
    <span
      style={{ ...textStyles.bodySmall, fontWeight: fontWeight.bold, color }}
      className="inline-flex items-center gap-xs whitespace-nowrap"
    >
      {asignado ? (
        <CheckCircleIcon className="h-4 w-4" />
      ) : (
        <XCircleIcon className="h-4 w-4" />
      )}
      {asignado ? 'Asignado' : 'Sin responsable'}
    </span>
  )
}

function ErrorRow({
  error,
  empresas,
  onOpen,
}: {
  error: ErrorTransaccion
  empresas: Empresa[]
  onOpen: () => void
}) {
  const EstadoTag = estadoTagByEstado[error.estado]

  return (
    <div
      style={{ borderColor: colors.background.border }}
      className="grid grid-cols-[110px_110px_minmax(120px,1fr)_minmax(110px,1fr)_minmax(140px,1fr)_minmax(90px,1fr)_56px] items-center gap-md border-b px-lg py-md last:border-b-0"
    >
      <EstadoTag />
      <span
        style={{
          ...textStyles.bodySmall,
          fontFamily: fontFamily.mono.join(', '),
          fontWeight: fontWeight.semibold,
          color: colors.gray.medium,
        }}
      >
        {error.codigo}
      </span>
      <span
        style={{
          ...textStyles.body,
          fontWeight: fontWeight.bold,
          color: colors.gray.darkest,
        }}
        className="truncate"
      >
        {empresaLabel(empresas, error.empresaId)}
      </span>
      <span
        style={{ ...textStyles.bodySmall, color: colors.gray.medium }}
        className="truncate"
      >
        {error.modulo}
      </span>
      <ResponsableIndicator asignado={error.responsableId !== null} />
      <span style={{ ...textStyles.bodySmall, color: colors.gray.medium }}>
        {formatElapsedSince(error.abiertoDesde)}
      </span>
      <ChevronButton
        color={colors.primary.dark}
        borderColor={colors.background.border}
        aria-label={`Abrir ${error.codigo}`}
        onClick={onOpen}
        className="justify-self-end"
      />
    </div>
  )
}

function Home({ onNavigate }: { onNavigate: (page: AppPage) => void }) {
  const { data, loading, error, refetch } = useHomeData()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activeNavItem, setActiveNavItem] = useState<SidebarItemId>('inicio')

  function handleSelectNavItem(item: SidebarNavItem) {
    const id = item.id
    setActiveNavItem(id)
    if (id === 'inicio') onNavigate('home')
    if (id === 'bandeja') onNavigate('bandeja')
    if (id === 'historial') onNavigate('historial')
  }

  return (
    <div
      style={{ backgroundColor: colors.background.page }}
      className="flex h-screen w-full"
    >
      <div
        style={{ borderColor: colors.background.border }}
        className={`shrink-0 overflow-hidden border-r transition-[width] duration-200 ease-in-out ${
          sidebarOpen ? 'w-[280px]' : 'w-0 border-r-0'
        }`}
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
          activeItem={activeNavItem}
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
        <div className="mx-auto flex max-w-[1400px] flex-col gap-xl">
          <div className="flex flex-wrap items-start justify-between gap-md">
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
                  Hola, {data?.currentUser.nombre.split(' ')[0] ?? '...'}
                </h1>
                <p style={{ ...textStyles.body, color: colors.gray.medium }}>
                  {formatTodayEs()}
                </p>
              </div>
            </div>
            <Button
              text=""
              color={colors.primary.default}
              onClick={refetch}
              disabled={loading}
              aria-label={loading ? 'Actualizando…' : 'Actualizar'}
              icon={
                <RefreshIcon
                  className={cn('h-5 w-5', loading && 'animate-spin')}
                />
              }
              size={{ padding: spacing.sm }}
            />
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

          <div className="grid grid-cols-1 gap-lg sm:grid-cols-2 xl:grid-cols-5">
            <StatCard
              label="Errores abiertos"
              value={data ? data.stats.erroresAbiertos : '—'}
              labelColor={colors.gray.default}
              valueColor={colors.gray.darkest}
              backgroundColor={colors.background.surface}
              icon={<AlertTriangleIcon className="h-5 w-5" />}
              iconColor={colors.label.red.text}
              iconBackground={colors.label.red.background}
              trend={
                data
                  ? {
                      text: `${data.stats.erroresAbiertosDelta} desde ayer`,
                      color: colors.status.error,
                      direction: 'up',
                    }
                  : undefined
              }
            />
            <StatCard
              label="Pend. de reproceso"
              value={data ? data.stats.pendientesReproceso : '—'}
              labelColor={colors.gray.default}
              valueColor={colors.gray.darkest}
              backgroundColor={colors.background.surface}
              icon={<UsersIcon className="h-5 w-5" />}
              iconColor={colors.label.orange.text}
              iconBackground={colors.label.orange.background}
              trend={{ text: 'En cola ahora', color: colors.gray.medium }}
            />
            <StatCard
              label="Resueltos hoy"
              value={data ? data.stats.resueltosHoy : '—'}
              labelColor={colors.gray.default}
              valueColor={colors.gray.darkest}
              backgroundColor={colors.background.surface}
              icon={<TrendingUpIcon className="h-5 w-5" />}
              iconColor={colors.label.green.text}
              iconBackground={colors.label.green.background}
              trend={
                data
                  ? {
                      text: `${data.stats.resueltosHoyDelta} vs. promedio`,
                      color: colors.status.success,
                      direction: 'up',
                    }
                  : undefined
              }
            />
            <StatCard
              label="Sin responsable"
              value={data ? data.stats.sinResponsable : '—'}
              labelColor={colors.gray.default}
              valueColor={colors.gray.darkest}
              backgroundColor={colors.background.surface}
              icon={<UserIcon className="h-5 w-5" />}
              iconColor={colors.label.red.text}
              iconBackground={colors.label.red.background}
              trend={{
                text: 'Requieren asignación',
                color: colors.status.error,
              }}
            />
            <StatCard
              label="Tiempo prom. resolución"
              value={
                data ? (
                  <span className="whitespace-nowrap">
                    {formatMinutes(data.stats.tiempoPromedioResolucionMinutos)}
                  </span>
                ) : (
                  '—'
                )
              }
              labelColor={colors.gray.default}
              valueColor={colors.gray.darkest}
              backgroundColor={colors.background.surface}
              icon={<ClockIcon className="h-5 w-5" />}
              iconColor={colors.label.blue.text}
              iconBackground={colors.label.blue.background}
              trend={
                data
                  ? {
                      text: `${formatMinutes(
                        Math.abs(
                          data.stats.tiempoPromedioResolucionDeltaMinutos,
                        ),
                      )} esta semana`,
                      color: colors.status.success,
                      direction: 'down',
                    }
                  : undefined
              }
            />
          </div>

          {loading || !data ? (
            <Table
              title="Requiere atención inmediata"
              subtitle="Errores sin asignar o abiertos hace más de 2 horas"
              actionText="Ver bandeja completa →"
              actionColor={colors.primary.dark}
              rows={4}
              columns={7}
              backgroundColor={colors.background.surface}
              titleColor={colors.gray.darkest}
              subtitleColor={colors.gray.medium}
              dividerColor={colors.background.border}
              cellPlaceholderColor={colors.background.page}
            />
          ) : (
            <div
              style={{ backgroundColor: colors.background.surface }}
              className="w-full rounded-xl shadow-md"
            >
              <div
                style={{ borderColor: colors.background.border }}
                className="flex items-start justify-between gap-md border-b px-lg py-lg"
              >
                <div className="flex flex-col gap-xxs">
                  <span
                    style={{
                      ...textStyles.h3,
                      fontWeight: fontWeight.bold,
                      color: colors.gray.darkest,
                    }}
                  >
                    Requiere atención inmediata
                  </span>
                  <span
                    style={{
                      ...textStyles.bodySmall,
                      color: colors.gray.medium,
                    }}
                  >
                    Errores sin asignar o abiertos hace más de 2 horas
                  </span>
                </div>
                <Button
                  text="Ver bandeja completa"
                  color={colors.primary.default}
                  variant="outline"
                  onClick={() => onNavigate('bandeja')}
                  icon={<InboxIcon className="h-4 w-4" />}
                  trailingIcon={<ChevronRightIcon className="h-4 w-4" />}
                  size={{
                    padding: `${spacing.sm} ${spacing.lg}`,
                    ...textStyles.bodySmall,
                    fontWeight: fontWeight.bold,
                  }}
                  className="shrink-0"
                />
              </div>

              <div>
                {data.erroresPrioritarios.map((item) => (
                  <ErrorRow
                    key={item.id}
                    error={item}
                    empresas={data.empresas}
                    onOpen={() => onNavigate('detalle')}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default Home
