import { useMemo, useState, type ReactNode } from 'react'
import { useAuth } from '../auth/useAuth'
import AppLayout from '../components/AppLayout'
import BarChart from '../components/BarChart'
import {
  ArrowUpRightIcon,
  BarChartIcon,
  CheckCircleIcon,
  ClockIcon,
  HistoryIcon,
  RefreshIcon,
  UserIcon,
  UsersIcon,
} from '../components/icons'
import PageHeader from '../components/PageHeader'
import Panel from '../components/Panel'
import StatCard from '../components/StatCard'
import Tabs from '../components/Tabs'
import {
  esExcluida,
  estadoLabels,
  estadoTagByEstado,
} from '../constants/estados'
import { estiloDe } from '../constants/trazabilidad'
import {
  prepararBandeja,
  type BandejaFilters,
} from '../hooks/useBandejaErrores'
import { useHomeData } from '../hooks/useHomeData'
import { colors } from '../styles'
import type { AppPage, ErrorEstado, ErrorTransaccion } from '../types'
import { cn } from '../utils/cn'
import {
  formatDuracion,
  formatMinutes,
  formatTodayEs,
  minutesSince,
} from '../utils/format'

/** Estados abiertos en el orden del circuito, con su color en la barra. */
const ESTADOS_ABIERTOS: { estado: ErrorEstado; color: string }[] = [
  { estado: 'ERROR', color: colors.status.error },
  { estado: 'ASIGNADO', color: '#2563eb' },
  { estado: 'EN_PROGRESO', color: colors.status.warning },
  { estado: 'REPROCESANDO', color: '#7c3aed' },
  { estado: 'REQUIERE_CORRECCION', color: '#db2777' },
]

/** "hace 5 min", "hace 3 h", "hace 2 días". */
function haceCuanto(iso: string): string {
  const minutos = Math.max(0, Math.round(minutesSince(iso)))
  if (minutos < 1) return 'recién'
  if (minutos < 60) return `hace ${minutos} min`
  const horas = Math.floor(minutos / 60)
  if (horas < 24) return `hace ${horas} h`
  const dias = Math.floor(horas / 24)
  return `hace ${dias} ${dias === 1 ? 'día' : 'días'}`
}

function Home({
  onNavigate,
  onOpenError,
}: {
  onNavigate: (page: AppPage) => void
  onOpenError: (id: string) => void
}) {
  const { usuario } = useAuth()
  const { data, loading, error, refetch } = useHomeData()
  const [serie, setSerie] = useState<'llegadas' | 'resoluciones'>('llegadas')
  const stats = data?.stats
  const semana = data?.semana

  /** Abre la bandeja ya filtrada por lo que se tocó. */
  function irABandeja(filtros: Partial<BandejaFilters> = {}) {
    prepararBandeja(filtros)
    onNavigate('bandeja')
  }

  // Los excluidos (status X) no son errores a resolver: no suman acá.
  const reales = useMemo(
    () => (data?.abiertos ?? []).filter((e) => !esExcluida(e)),
    [data],
  )
  const porEstado = ESTADOS_ABIERTOS.map((item) => ({
    ...item,
    cantidad: reales.filter((e) => e.estado === item.estado).length,
  }))
  const porEmpresa = useMemo(() => {
    const conteo = new Map<string, { id: string; nombre: string; n: number }>()
    for (const e of reales) {
      conteo.set(e.empresaId, {
        id: e.empresaId,
        nombre: e.empresaNombre,
        n: (conteo.get(e.empresaId)?.n ?? 0) + 1,
      })
    }
    return [...conteo.values()].sort((a, b) => b.n - a.n)
  }, [reales])
  const maxEmpresa = porEmpresa[0]?.n ?? 1
  const maxSemana = Math.max(1, ...(semana?.serie ?? []).map((p) => p.llegadas))

  return (
    <AppLayout
      activeItem="inicio"
      onNavigate={onNavigate}
      migas={[{ label: 'Inicio' }]}
    >
      <PageHeader
        eyebrow={`Hola de nuevo, ${usuario?.nombre.split(' ')[0] ?? 'equipo'} 👋`}
        titulo="Inicio"
        acciones={
          <>
            <span className="rounded-full bg-background-surface px-md py-xs text-bodySmall font-semibold text-gray-dark shadow-soft ring-1 ring-slate-900/[0.04]">
              {formatTodayEs()}
            </span>
            <button
              type="button"
              onClick={refetch}
              disabled={loading}
              aria-label={loading ? 'Actualizando…' : 'Actualizar'}
              title="Actualizar"
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-background-surface text-gray-dark shadow-soft ring-1 ring-slate-900/[0.04] transition-colors hover:text-primary-dark disabled:opacity-60"
            >
              <RefreshIcon
                className={cn('h-4 w-4', loading && 'animate-spin')}
              />
            </button>
          </>
        }
      />

      {/* Resumen del día en una frase y los atajos principales. */}
      <section className="relative overflow-hidden rounded-xxxl bg-[linear-gradient(135deg,#166534_0%,#14532d_45%,#0b2e18_100%)] p-lg text-white shadow-lift @3xl:p-xl">
        <span
          aria-hidden
          className="pointer-events-none absolute -top-24 right-[30%] h-64 w-64 rounded-full border-[40px] border-white/[0.04]"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute -right-16 -bottom-28 h-80 w-80 rounded-full bg-brand-lime/20 blur-3xl"
        />

        <div className="relative flex flex-wrap items-stretch justify-between gap-xl">
          <div className="flex max-w-[40rem] min-w-0 flex-1 basis-[22rem] flex-col gap-md">
            <span className="text-caption font-semibold tracking-wide text-brand-limeSoft uppercase">
              Hoy en la bandeja
            </span>
            <p className="text-destacado font-medium tracking-[-0.02em] text-white/75">
              {stats ? (
                <>
                  Hay <b className="text-white">{stats.erroresAbiertos}</b>{' '}
                  errores abiertos
                  {stats.sinResponsable > 0 && (
                    <>
                      {' '}
                      y <b className="text-white">
                        {stats.sinResponsable}
                      </b>{' '}
                      esperan responsable
                    </>
                  )}
                  . Hoy se{' '}
                  {stats.resueltosHoy === 1 ? 'resolvió' : 'resolvieron'}{' '}
                  <b className="text-white">{stats.resueltosHoy}</b>.
                </>
              ) : (
                'Cargando cómo viene la bandeja…'
              )}
            </p>
            <div className="mt-xs flex flex-wrap items-center gap-sm">
              <button
                type="button"
                onClick={() => irABandeja()}
                className="group inline-flex cursor-pointer items-center gap-sm rounded-full bg-brand-lime py-xs pr-xs pl-lg text-body font-semibold text-brand-deep transition-transform hover:-translate-y-0.5"
              >
                Ir a la bandeja
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-deep text-brand-lime transition-transform duration-200 group-hover:rotate-45">
                  <ArrowUpRightIcon className="h-4 w-4" />
                </span>
              </button>
              {stats && stats.sinResponsable > 0 && (
                <button
                  type="button"
                  onClick={() => irABandeja({ responsableId: 'sin-asignar' })}
                  className="inline-flex cursor-pointer items-center gap-xs rounded-full bg-white/10 px-lg py-sm text-body font-semibold text-white ring-1 ring-white/20 transition-colors hover:bg-white/20"
                >
                  <UserIcon className="h-4 w-4" />
                  Repartir los sin responsable
                </button>
              )}
            </div>
          </div>

          {/* La semana en tres números; lleva a Métricas. */}
          <button
            type="button"
            onClick={() => onNavigate('metricas')}
            className="group flex w-full max-w-[24rem] min-w-[16rem] flex-1 cursor-pointer flex-col justify-between gap-md rounded-xxl bg-white/[0.08] p-md text-left ring-1 ring-white/15 backdrop-blur-sm transition-colors hover:bg-white/[0.13]"
          >
            <span className="flex items-center justify-between gap-sm">
              <span className="text-caption font-semibold tracking-wide text-brand-limeSoft uppercase">
                Últimos 7 días
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 transition-all duration-200 group-hover:rotate-45 group-hover:bg-white group-hover:text-primary-dark">
                <ArrowUpRightIcon className="h-3.5 w-3.5" />
              </span>
            </span>
            <span aria-hidden className="flex h-14 items-end gap-xs">
              {(semana?.serie ?? []).map((p) => (
                <span
                  key={p.id}
                  title={`${p.etiqueta}: ${p.llegadas} llegaron`}
                  style={{
                    height: `${Math.max(8, (p.llegadas / maxSemana) * 100)}%`,
                  }}
                  className={cn(
                    'flex-1 rounded-full transition-[height] duration-500',
                    p.llegadas === maxSemana && p.llegadas > 0
                      ? 'bg-brand-lime'
                      : 'bg-white/25',
                  )}
                />
              ))}
            </span>
            <span className="grid grid-cols-3 gap-sm">
              <DatoSemana valor={semana?.totales.llegadas} label="llegaron" />
              <DatoSemana
                valor={semana?.totales.correcciones}
                label="corregidos"
              />
              <DatoSemana
                valor={semana?.totales.resoluciones}
                label="resueltos"
              />
            </span>
          </button>
        </div>
      </section>

      {error && (
        <div className="flex items-center justify-between gap-md rounded-xxl border border-label-red-outline bg-label-red-background px-lg py-md text-bodySmall font-semibold text-label-red-text">
          {error}
          <button type="button" className="underline" onClick={refetch}>
            Reintentar
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-md @sm:grid-cols-2 @sm:gap-lg @5xl:grid-cols-4">
        <StatCard
          label="Sin responsable"
          value={stats ? stats.sinResponsable : '—'}
          labelColor={colors.gray.medium}
          valueColor={colors.gray.darkest}
          backgroundColor={colors.background.surface}
          icon={<UserIcon className="h-4 w-4" />}
          iconColor={colors.label.red.text}
          iconBackground={colors.label.red.background}
          trend={{ text: 'Requieren asignación', color: colors.status.error }}
          onIr={() => irABandeja({ responsableId: 'sin-asignar' })}
          irLabel="Ver los sin responsable en la bandeja"
        />
        <StatCard
          label="Reprocesando"
          value={stats ? stats.pendientesReproceso : '—'}
          labelColor={colors.gray.medium}
          valueColor={colors.gray.darkest}
          backgroundColor={colors.background.surface}
          icon={<UsersIcon className="h-4 w-4" />}
          iconColor={colors.label.purple.text}
          iconBackground={colors.label.purple.background}
          trend={{ text: 'Esperan a Softland', color: colors.gray.medium }}
          onIr={() => irABandeja({ estado: 'REPROCESANDO' })}
          irLabel="Ver los que se están reprocesando"
        />
        <StatCard
          label="Resueltos hoy"
          value={stats ? stats.resueltosHoy : '—'}
          labelColor={colors.gray.medium}
          valueColor={colors.gray.darkest}
          backgroundColor={colors.background.surface}
          icon={<CheckCircleIcon className="h-4 w-4" />}
          iconColor={colors.label.green.text}
          iconBackground={colors.label.green.background}
          trend={{ text: 'Quedaron en S', color: colors.status.success }}
          onIr={() => onNavigate('historial-iris')}
          irLabel="Ver en el historial de IRIS"
        />
        <StatCard
          label="Tiempo prom. resolución"
          value={
            stats ? (
              <span className="whitespace-nowrap">
                {formatMinutes(stats.tiempoPromedioResolucionMinutos)}
              </span>
            ) : (
              '—'
            )
          }
          labelColor={colors.gray.medium}
          valueColor={colors.gray.darkest}
          backgroundColor={colors.background.surface}
          icon={<ClockIcon className="h-4 w-4" />}
          iconColor={colors.label.blue.text}
          iconBackground={colors.label.blue.background}
          trend={{ text: 'De la detección a la S', color: colors.gray.medium }}
          onIr={() => onNavigate('metricas')}
          irLabel="Ver métricas"
        />
      </div>

      <div className="grid grid-cols-1 gap-lg @4xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <Panel
          titulo="Cómo está la bandeja"
          subtitulo="Tocá un estado o una empresa para abrirla filtrada"
          onIr={() => irABandeja()}
          irLabel="Ir a la bandeja de errores"
        >
          {!data ? (
            <div className="h-56 animate-pulse rounded-xxl bg-background-subtle" />
          ) : reales.length === 0 ? (
            <Vacio texto="No hay errores abiertos. ¡Bandeja limpia!" />
          ) : (
            <div className="flex flex-col gap-lg">
              {/* Barra apilada por estado: cada tramo filtra la bandeja. */}
              <div className="flex h-4 w-full gap-[3px]">
                {porEstado
                  .filter((p) => p.cantidad > 0)
                  .map((p) => (
                    <button
                      key={p.estado}
                      type="button"
                      title={`${estadoLabels[p.estado]}: ${p.cantidad}`}
                      aria-label={`Ver ${estadoLabels[p.estado]} en la bandeja`}
                      onClick={() => irABandeja({ estado: p.estado })}
                      style={{
                        flexGrow: p.cantidad,
                        backgroundColor: p.color,
                      }}
                      className="min-w-2 cursor-pointer rounded-full transition-[filter,transform] hover:scale-y-125 hover:brightness-110"
                    />
                  ))}
              </div>
              <div className="flex flex-wrap gap-sm">
                {porEstado.map((p) => (
                  <button
                    key={p.estado}
                    type="button"
                    disabled={p.cantidad === 0}
                    onClick={() => irABandeja({ estado: p.estado })}
                    className="inline-flex cursor-pointer items-center gap-sm rounded-full bg-background-subtle py-xs pr-md pl-sm text-bodySmall font-semibold text-gray-dark transition-colors hover:bg-primary-lightest disabled:cursor-default disabled:opacity-45 disabled:hover:bg-background-subtle"
                  >
                    <span
                      aria-hidden
                      style={{ backgroundColor: p.color }}
                      className="h-2.5 w-2.5 rounded-full"
                    />
                    {estadoLabels[p.estado]}
                    <b className="text-gray-darkest tabular-nums">
                      {p.cantidad}
                    </b>
                  </button>
                ))}
              </div>

              <div className="flex flex-col gap-sm">
                <span className="text-overline font-semibold tracking-widest text-gray-default uppercase">
                  Por empresa
                </span>
                <ul className="grid grid-cols-1 gap-xs @lg:grid-cols-2">
                  {porEmpresa.slice(0, 6).map((empresa) => (
                    <li key={empresa.id}>
                      <button
                        type="button"
                        onClick={() => irABandeja({ empresaId: empresa.id })}
                        className="group flex w-full cursor-pointer flex-col gap-xs rounded-2xl px-sm py-sm text-left transition-colors hover:bg-background-subtle"
                      >
                        <span className="flex items-baseline justify-between gap-sm">
                          <span className="truncate text-bodySmall font-semibold text-gray-darkest">
                            {empresa.nombre}
                          </span>
                          <span className="flex shrink-0 items-center gap-xs text-bodySmall font-semibold text-gray-dark tabular-nums">
                            {empresa.n}
                            <ArrowUpRightIcon className="h-3.5 w-3.5 text-gray-default opacity-0 transition-opacity group-hover:opacity-100" />
                          </span>
                        </span>
                        <span className="h-2 w-full rounded-full bg-background-subtle group-hover:bg-white">
                          <span
                            style={{
                              width: `${(empresa.n / maxEmpresa) * 100}%`,
                            }}
                            className="block h-full rounded-full bg-primary-default transition-[width] duration-500"
                          />
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </Panel>

        <Panel
          titulo="La semana"
          subtitulo="Pasá el mouse por una barra para ver el día"
          onIr={() => onNavigate('metricas')}
          irLabel="Ver métricas"
          acciones={
            <Tabs
              items={[
                { id: 'llegadas', label: 'Llegaron' },
                { id: 'resoluciones', label: 'Resueltos' },
              ]}
              value={serie}
              onChange={(id) => setSerie(id as 'llegadas' | 'resoluciones')}
              activeColor={colors.gray.darkest}
              inactiveColor={colors.gray.medium}
            />
          }
        >
          {semana ? (
            <BarChart
              puntos={semana.serie.map((p) => ({
                id: p.id,
                etiqueta: p.etiqueta,
                valor: p[serie],
              }))}
              unidad={serie}
              height={220}
              className="pt-xl"
            />
          ) : (
            <div className="h-[260px] animate-pulse rounded-xxl bg-background-subtle" />
          )}
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-lg @4xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <Panel
          titulo="Lo que más espera"
          subtitulo="Sin responsable o abiertos hace más de 2 horas"
          onIr={() => irABandeja()}
          irLabel="Ver todos en la bandeja"
        >
          {!data ? (
            <div className="grid grid-cols-1 gap-sm @lg:grid-cols-2">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-36 animate-pulse rounded-xxl bg-background-subtle"
                />
              ))}
            </div>
          ) : data.erroresPrioritarios.length === 0 ? (
            <Vacio texto="Nada urgente: todo tiene responsable y nada lleva más de 2 horas." />
          ) : (
            <div className="grid grid-cols-1 gap-sm @lg:grid-cols-2">
              {data.erroresPrioritarios.slice(0, 4).map((item) => (
                <Urgente
                  key={item.id}
                  error={item}
                  onOpen={() => onOpenError(item.id)}
                />
              ))}
            </div>
          )}
        </Panel>

        <Panel
          titulo="Últimos movimientos"
          subtitulo="Lo último que pasó en IRIS"
          onIr={() => onNavigate('historial-iris')}
          irLabel="Ver el historial de IRIS"
          padding="none"
        >
          {!data ? (
            <div className="mx-lg mb-lg h-64 animate-pulse rounded-xxl bg-background-subtle" />
          ) : data.movimientos.length === 0 ? (
            <div className="px-lg pb-lg">
              <Vacio texto="Sin movimientos en los últimos 30 días." />
            </div>
          ) : (
            <ul className="flex flex-col gap-xxs px-sm pb-sm">
              {data.movimientos.map((evento) => {
                const estilo = estiloDe(evento.tipo)
                return (
                  <li key={evento.id}>
                    <button
                      type="button"
                      onClick={() => onOpenError(evento.transaccionId)}
                      className="group flex w-full cursor-pointer items-center gap-md rounded-2xl px-sm py-sm text-left transition-colors hover:bg-background-subtle"
                    >
                      <span
                        style={{
                          color: estilo.color,
                          backgroundColor: estilo.background,
                        }}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                      >
                        {estilo.icon}
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-bodySmall font-semibold text-gray-darkest">
                          {evento.titulo}
                        </span>
                        <span className="truncate text-caption text-gray-medium">
                          {evento.empresa} ·{' '}
                          <span className="font-mono">{evento.codigo}</span>
                        </span>
                      </span>
                      <span className="shrink-0 text-caption whitespace-nowrap text-gray-default">
                        {haceCuanto(evento.hora)}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-lg @2xl:grid-cols-2">
        <Acceso
          icon={<BarChartIcon className="h-5 w-5" />}
          titulo="Métricas"
          texto="Llegadas, tiempos del circuito y efectividad"
          onIr={() => onNavigate('metricas')}
        />
        <Acceso
          icon={<HistoryIcon className="h-5 w-5" />}
          titulo="Mi historial"
          texto="Lo que tenés asignado y lo que corregiste"
          onIr={() => onNavigate('historial')}
        />
      </div>
    </AppLayout>
  )
}

/** Tarjetita de un error que espera: se abre entera. */
function Urgente({
  error,
  onOpen,
}: {
  error: ErrorTransaccion
  onOpen: () => void
}) {
  const EstadoTag = estadoTagByEstado[error.estado]
  const sinResponsable = error.responsableId === null

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex cursor-pointer flex-col gap-md rounded-xxl bg-background-subtle p-md text-left ring-1 ring-transparent transition-all duration-200 hover:-translate-y-0.5 hover:bg-background-surface hover:shadow-lift hover:ring-background-border"
    >
      <span className="flex items-center justify-between gap-sm">
        <EstadoTag />
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-background-surface text-gray-dark ring-1 ring-background-border transition-all duration-200 group-hover:rotate-45 group-hover:bg-primary-default group-hover:text-white group-hover:ring-primary-default">
          <ArrowUpRightIcon className="h-3.5 w-3.5" />
        </span>
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-body font-semibold text-gray-darkest">
          {error.empresaNombre}
        </span>
        <span className="truncate text-caption text-gray-medium">
          <span className="font-mono font-semibold">{error.codigo}</span> ·{' '}
          {error.modulo}
        </span>
      </span>
      <span className="flex items-center justify-between gap-sm">
        <span className="inline-flex items-center gap-xs text-bodySmall font-semibold text-gray-darkest tabular-nums">
          <ClockIcon className="h-3.5 w-3.5 text-gray-default" />
          {formatDuracion(minutesSince(error.abiertoDesde))}
        </span>
        <span
          className={cn(
            'rounded-full px-sm py-xxs text-caption font-semibold',
            sinResponsable
              ? 'bg-label-red-background text-label-red-text'
              : 'bg-label-green-background text-label-green-text',
          )}
        >
          {sinResponsable ? 'Sin responsable' : 'Asignado'}
        </span>
      </span>
    </button>
  )
}

function DatoSemana({
  valor,
  label,
}: {
  valor: number | undefined
  label: string
}) {
  return (
    <span className="flex flex-col">
      <span className="text-h3 font-medium tabular-nums">{valor ?? '—'}</span>
      <span className="text-caption text-white/65">{label}</span>
    </span>
  )
}

function Vacio({ texto }: { texto: string }) {
  return (
    <div className="flex flex-col items-center gap-sm py-lg text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-label-green-background text-label-green-text">
        <CheckCircleIcon className="h-5 w-5" />
      </span>
      <span className="text-body text-gray-medium">{texto}</span>
    </div>
  )
}

/** Accesos de abajo: cada uno lleva a una sección. */
function Acceso({
  icon,
  titulo,
  texto,
  onIr,
}: {
  icon: ReactNode
  titulo: string
  texto: string
  onIr: () => void
}) {
  return (
    <button
      type="button"
      onClick={onIr}
      className="group flex cursor-pointer items-center gap-md rounded-xxl bg-background-surface p-md text-left shadow-soft ring-1 ring-slate-900/[0.04] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift"
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-lightest text-primary-dark">
        {icon}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-body font-semibold text-gray-darkest">
          {titulo}
        </span>
        <span className="truncate text-bodySmall text-gray-medium">
          {texto}
        </span>
      </span>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-background-surface text-gray-dark ring-1 ring-background-border transition-all duration-200 group-hover:rotate-45 group-hover:bg-primary-default group-hover:text-white group-hover:ring-primary-default">
        <ArrowUpRightIcon className="h-4 w-4" />
      </span>
    </button>
  )
}

export default Home
