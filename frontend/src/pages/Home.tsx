import { useState } from 'react'
import Button from '../components/Button'
import {
  AlertTriangleIcon,
  ClockIcon,
  HistoryIcon,
  HomeIcon,
  InboxIcon,
  PanelLeftIcon,
  TrendingUpIcon,
  UserIcon,
  UsersIcon,
} from '../components/icons'
import Sidebar, {
  type SidebarNavItem,
  type SidebarSection,
} from '../components/Sidebar'
import StatCard from '../components/StatCard'
import Table from '../components/Table'
import {
  AsignadoTag,
  CorregidoTag,
  EnProgresoTag,
  ErrorTag,
  PendienteTag,
  ResueltoTag,
} from '../components/Tag'
import { useHomeData } from '../hooks/useHomeData'
import { colors, spacing } from '../styles'
import type { Empresa, ErrorEstado, ErrorPrioritario } from '../types'
import {
  formatElapsedSince,
  formatMinutes,
  formatTodayEs,
} from '../utils/format'

const estadoTagByEstado: Record<ErrorEstado, () => React.JSX.Element> = {
  ERROR: ErrorTag,
  PENDIENTE: PendienteTag,
  ASIGNADO: AsignadoTag,
  EN_PROGRESO: EnProgresoTag,
  CORREGIDO: CorregidoTag,
  RESUELTO: ResueltoTag,
}

function empresaLabel(empresas: Empresa[], empresaId: string) {
  return (
    empresas.find((empresa) => empresa.id === empresaId)?.nombre ?? empresaId
  )
}

function ResponsableIndicator({ asignado }: { asignado: boolean }) {
  const color = asignado ? colors.status.success : colors.status.error

  return (
    <span
      style={{ color }}
      className="inline-flex items-center gap-xs text-bodySmall font-bold whitespace-nowrap"
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      {asignado ? 'Asignado' : 'Sin responsable'}
    </span>
  )
}

function ErrorRow({
  error,
  empresas,
}: {
  error: ErrorPrioritario
  empresas: Empresa[]
}) {
  const EstadoTag = estadoTagByEstado[error.estado]

  return (
    <div
      style={{ borderColor: colors.background.border }}
      className="grid grid-cols-[120px_110px_1fr_140px_80px_90px] items-center gap-md border-b px-lg py-md last:border-b-0"
    >
      <EstadoTag />
      <span
        style={{ color: colors.gray.medium }}
        className="font-mono text-bodySmall font-semibold"
      >
        {error.codigo}
      </span>
      <div className="flex min-w-0 flex-col gap-xxs">
        <span
          style={{ color: colors.gray.darkest }}
          className="truncate text-body font-bold"
        >
          {empresaLabel(empresas, error.empresaId)} · {error.modulo}
        </span>
        <span
          style={{ color: colors.gray.medium }}
          className="truncate text-bodySmall"
        >
          {error.descripcion}
        </span>
      </div>
      <ResponsableIndicator asignado={error.responsableId !== null} />
      <span style={{ color: colors.gray.medium }} className="text-bodySmall">
        {formatElapsedSince(error.abiertoDesde)}
      </span>
      <button
        type="button"
        style={{ color: colors.primary.dark }}
        className="inline-flex items-center justify-end gap-xs text-bodySmall font-bold transition-opacity hover:opacity-80"
      >
        Abrir <span aria-hidden>→</span>
      </button>
    </div>
  )
}

function Home() {
  const { data, loading, error, refetch } = useHomeData()
  const [activeNavItem, setActiveNavItem] = useState('inicio')
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const sections: SidebarSection[] = [
    {
      title: 'Principal',
      items: [
        {
          id: 'inicio',
          icon: <HomeIcon className="h-5 w-5" />,
          label: 'Inicio',
        },
        {
          id: 'bandeja',
          icon: <InboxIcon className="h-5 w-5" />,
          label: 'Bandeja de errores',
          badge: data
            ? {
                text: String(data.stats.bandejaPendientes),
                color: colors.label.orange.text,
                backgroundColor: colors.label.orange.background,
              }
            : undefined,
        },
        {
          id: 'historial',
          icon: <HistoryIcon className="h-5 w-5" />,
          label: 'Historial',
        },
      ],
    },
    {
      title: 'Empresas',
      items: (data?.empresas ?? []).map<SidebarNavItem>((empresa) => ({
        id: `empresa-${empresa.id}`,
        label: empresa.nombre,
        icon: (
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: colors.gray.default }}
          />
        ),
      })),
    },
  ]

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
          onItemSelect={(item) => setActiveNavItem(item.id ?? item.label)}
          sections={sections}
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
                <h1
                  style={{ color: colors.gray.darkest }}
                  className="text-h1 font-bold"
                >
                  Hola, {data?.currentUser.nombre.split(' ')[0] ?? '...'}
                </h1>
                <p style={{ color: colors.gray.medium }} className="text-body">
                  {formatTodayEs()} — Así está la operación de errores hoy.
                </p>
              </div>
            </div>
            <Button
              text={loading ? 'Actualizando…' : '↻ Actualizar'}
              color={colors.primary.default}
              onClick={refetch}
              disabled={loading}
              size={{ padding: `${spacing.sm} ${spacing.lg}` }}
              className="text-bodySmall"
            />
          </div>

          {error && (
            <div
              style={{
                backgroundColor: colors.label.red.background,
                color: colors.label.red.text,
                borderColor: colors.label.red.outline,
              }}
              className="flex items-center justify-between gap-md rounded-xl border px-lg py-md text-bodySmall font-semibold"
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
              columns={5}
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
                    style={{ color: colors.gray.darkest }}
                    className="text-h3 font-bold"
                  >
                    Requiere atención inmediata
                  </span>
                  <span
                    style={{ color: colors.gray.medium }}
                    className="text-bodySmall"
                  >
                    Errores sin asignar o abiertos hace más de 2 horas
                  </span>
                </div>
                <button
                  type="button"
                  style={{ color: colors.primary.dark }}
                  className="inline-flex shrink-0 items-center gap-xs text-bodySmall font-bold transition-opacity hover:opacity-80"
                >
                  Ver bandeja completa <span aria-hidden>→</span>
                </button>
              </div>

              <div>
                {data.erroresPrioritarios.map((item) => (
                  <ErrorRow
                    key={item.id}
                    error={item}
                    empresas={data.empresas}
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
