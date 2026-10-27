import { useEffect, useMemo, useState, type ReactNode } from 'react'
import AppLayout from '../components/AppLayout'
import BarChart, { type BarraPunto } from '../components/BarChart'
import Button from '../components/Button'
import Gauge from '../components/Gauge'
import {
  AlertTriangleIcon,
  ArrowUpRightIcon,
  CheckCircleIcon,
  InboxIcon,
  RefreshIcon,
  SendIcon,
  UserIcon,
} from '../components/icons'
import PageHeader from '../components/PageHeader'
import Panel from '../components/Panel'
import StatCard from '../components/StatCard'
import Tabs, { type TabItem } from '../components/Tabs'
import { useMetricas } from '../hooks/useMetricas'
import { colors, spacing } from '../styles'
import type {
  AppPage,
  GrupoMetricas,
  PuntoMetricas,
  TotalesMetricas,
} from '../types'
import { cn } from '../utils/cn'
import { formatDuracion, iniciales } from '../utils/format'

const PERIODOS: TabItem[] = [
  { id: '7', label: '7 días' },
  { id: '30', label: '30 días' },
  { id: '90', label: '90 días' },
]

type Serie = 'llegadas' | 'asignaciones' | 'correcciones' | 'resoluciones'

const SERIES: TabItem[] = [
  { id: 'llegadas', label: 'Llegadas' },
  { id: 'asignaciones', label: 'Asignaciones' },
  { id: 'correcciones', label: 'Correcciones' },
  { id: 'resoluciones', label: 'Resoluciones' },
]

/** Con 90 días, una barra por día no se lee: se agrupa por semana. */
function barras(serie: PuntoMetricas[], campo: Serie): BarraPunto[] {
  if (serie.length <= 31) {
    return serie.map((p) => ({
      id: p.id,
      etiqueta: p.etiqueta,
      valor: p[campo],
    }))
  }
  const semanas: BarraPunto[] = []
  for (let i = 0; i < serie.length; i += 7) {
    const tramo = serie.slice(i, i + 7)
    semanas.push({
      id: tramo[0].id,
      etiqueta: tramo[0].etiqueta,
      detalle: `semana del ${tramo[0].etiqueta}`,
      valor: tramo.reduce((acc, p) => acc + p[campo], 0),
    })
  }
  return semanas
}

/**
 * "+3 vs. período anterior". `subirEsBueno` decide el color: que lleguen más
 * errores es malo, que se resuelvan más es bueno.
 */
function tendencia(
  actual: number,
  anterior: number,
  subirEsBueno: boolean,
): { text: string; color: string; direction?: 'up' | 'down' } {
  const diferencia = actual - anterior
  if (diferencia === 0) {
    return { text: 'Igual que el período anterior', color: colors.gray.medium }
  }
  const sube = diferencia > 0
  return {
    text: `${sube ? '+' : '−'}${Math.abs(diferencia)} vs. período anterior`,
    color: sube === subirEsBueno ? colors.status.success : colors.status.error,
    direction: sube ? 'up' : 'down',
  }
}

// La pantalla se desmonta al navegar: período y serie quedan acá.
let estadoGuardado = { periodo: '30', serie: 'llegadas' as Serie }

function Metricas({ onNavigate }: { onNavigate: (page: AppPage) => void }) {
  const [periodo, setPeriodo] = useState(estadoGuardado.periodo)
  const [serie, setSerie] = useState<Serie>(estadoGuardado.serie)
  const { data, loading, error, refetch } = useMetricas(Number(periodo))

  useEffect(() => {
    estadoGuardado = { periodo, serie }
  }, [periodo, serie])

  const totales = data?.totales
  const anteriores = data?.anteriores
  const puntos = useMemo(() => barras(data?.serie ?? [], serie), [data, serie])
  const sinMovimiento =
    data !== null && Object.values(data.totales).every((valor) => valor === 0)

  const kpi = (
    campo: keyof TotalesMetricas,
    subirEsBueno: boolean,
  ): {
    value: ReactNode
    trend?: ReturnType<typeof tendencia>
  } => ({
    value: totales ? totales[campo] : '—',
    trend:
      totales && anteriores
        ? tendencia(totales[campo], anteriores[campo], subirEsBueno)
        : undefined,
  })

  return (
    <AppLayout
      activeItem="metricas"
      onNavigate={onNavigate}
      migas={[{ label: 'Inicio', page: 'home' }, { label: 'Métricas' }]}
      recordarScroll="metricas"
    >
      <PageHeader
        eyebrow={`Cómo viene el equipo${data ? ` · ${data.periodo.toLowerCase()}` : ''}`}
        titulo="Métricas"
        acciones={
          <>
            <Tabs
              items={PERIODOS}
              value={periodo}
              onChange={setPeriodo}
              activeColor={colors.gray.darkest}
              inactiveColor={colors.gray.medium}
            />
            <Button
              text=""
              color={colors.primary.default}
              onClick={refetch}
              disabled={loading}
              aria-label={loading ? 'Actualizando…' : 'Actualizar'}
              title="Actualizar"
              icon={
                <RefreshIcon
                  className={cn('h-5 w-5', loading && 'animate-spin')}
                />
              }
              size={{ padding: spacing.sm }}
            />
          </>
        }
      />

      {error && (
        <div className="flex items-center justify-between gap-md rounded-xxl border border-label-red-outline bg-label-red-background px-lg py-md text-bodySmall font-semibold text-label-red-text">
          {error}
          <button type="button" className="underline" onClick={refetch}>
            Reintentar
          </button>
        </div>
      )}

      {sinMovimiento && (
        <div className="flex items-center gap-sm rounded-xxl bg-label-blue-background px-lg py-md text-bodySmall font-semibold text-label-blue-text">
          No hubo movimiento en este período. Probá con uno más largo.
        </div>
      )}

      <div className="grid grid-cols-1 gap-md @sm:grid-cols-2 @sm:gap-lg @5xl:grid-cols-4">
        <StatCard
          label="Errores que llegaron"
          {...kpi('llegadas', false)}
          labelColor={colors.gray.medium}
          valueColor={colors.gray.darkest}
          backgroundColor={colors.background.surface}
          icon={<AlertTriangleIcon className="h-4 w-4" />}
          iconColor={colors.label.red.text}
          iconBackground={colors.label.red.background}
          onIr={() => onNavigate('bandeja')}
          irLabel="Ir a la bandeja de errores"
        />
        <StatCard
          label="Asignaciones"
          {...kpi('asignaciones', true)}
          labelColor={colors.gray.medium}
          valueColor={colors.gray.darkest}
          backgroundColor={colors.background.surface}
          icon={<UserIcon className="h-4 w-4" />}
          iconColor={colors.label.orange.text}
          iconBackground={colors.label.orange.background}
          onIr={() => onNavigate('bandeja')}
          irLabel="Ir a la bandeja de errores"
        />
        <StatCard
          label="Corregidos"
          {...kpi('correcciones', true)}
          labelColor={colors.gray.medium}
          valueColor={colors.gray.darkest}
          backgroundColor={colors.background.surface}
          icon={<SendIcon className="h-4 w-4" />}
          iconColor={colors.label.blue.text}
          iconBackground={colors.label.blue.background}
          onIr={() => onNavigate('historial-iris')}
          irLabel="Ver en el historial de IRIS"
        />
        <StatCard
          label="Resueltos"
          {...kpi('resoluciones', true)}
          labelColor={colors.gray.medium}
          valueColor={colors.gray.darkest}
          backgroundColor={colors.background.surface}
          icon={<CheckCircleIcon className="h-4 w-4" />}
          iconColor={colors.label.green.text}
          iconBackground={colors.label.green.background}
          note={
            totales?.resolucionesAutomaticas
              ? `${totales.resolucionesAutomaticas} por verificación automática`
              : undefined
          }
          onIr={() => onNavigate('historial-iris')}
          irLabel="Ver en el historial de IRIS"
        />
      </div>

      <div className="grid grid-cols-1 gap-lg @4xl:grid-cols-[minmax(0,1fr)_21rem]">
        <Panel
          titulo="Actividad"
          subtitulo={
            (data?.serie.length ?? 0) > 31
              ? 'Por semana · pasá el mouse por una barra para ver el valor'
              : 'Por día · pasá el mouse por una barra para ver el valor'
          }
          acciones={
            <Tabs
              items={SERIES}
              value={serie}
              onChange={(id) => setSerie(id as Serie)}
              activeColor={colors.gray.darkest}
              inactiveColor={colors.gray.medium}
            />
          }
        >
          {data ? (
            <BarChart
              puntos={puntos}
              unidad={serie}
              height={260}
              className="pt-xl"
            />
          ) : (
            <div className="h-[300px] animate-pulse rounded-xxl bg-background-subtle" />
          )}
        </Panel>

        <Panel
          titulo="Efectividad de reprocesos"
          subtitulo="De los que ya tienen resultado, cuántos quedaron en S"
          onIr={() => onNavigate('historial-iris')}
          irLabel="Ver los cierres en el historial de IRIS"
        >
          <div className="flex flex-col gap-lg pt-sm">
            <Gauge
              porcentaje={data?.efectividad ?? null}
              etiqueta="salieron bien"
            />
            <ul className="flex flex-col gap-sm">
              <Leyenda
                color={colors.primary.default}
                label="Resueltos por reproceso"
                valor={
                  totales
                    ? totales.resoluciones - totales.resolucionesAutomaticas
                    : '—'
                }
              />
              <Leyenda
                color={colors.status.error}
                label="Volvieron con error"
                valor={totales?.fallos ?? '—'}
              />
              <Leyenda
                rayada
                color={colors.gray.default}
                label="Cerrados por verificación"
                valor={totales?.resolucionesAutomaticas ?? '—'}
              />
            </ul>
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-lg @2xl:grid-cols-2 @6xl:grid-cols-3">
        <Panel
          titulo="Tiempos del circuito"
          subtitulo="Promedio desde que se detecta el error"
        >
          <ol className="relative flex flex-col gap-md">
            <span
              aria-hidden
              className="absolute top-md bottom-md left-[19px] w-0.5 bg-[repeating-linear-gradient(to_bottom,#cfe9d8_0_6px,transparent_6px_10px)]"
            />
            <Hito numero={1} titulo="Llega a la bandeja" valor="Inicio" tenue />
            <Hito
              numero={2}
              titulo="Se asigna"
              valor={duracion(data?.tiempos.asignacion)}
            />
            <Hito
              numero={3}
              titulo="Se corrige y reprocesa"
              valor={duracion(data?.tiempos.correccion)}
            />
            <Hito
              numero={4}
              titulo="Queda resuelto"
              valor={duracion(data?.tiempos.resolucion)}
              final
            />
          </ol>
        </Panel>

        <Panel titulo="Por módulo" subtitulo="Llegadas y resoluciones">
          <Grupos grupos={data?.porModulo} />
        </Panel>

        <Panel
          titulo="Empresas con más errores"
          subtitulo="Las que más trajeron en el período"
          onIr={() => onNavigate('bandeja')}
          irLabel="Ir a la bandeja de errores"
          className="@2xl:col-span-2 @6xl:col-span-1"
        >
          <Grupos grupos={data?.porEmpresa} vacio="Sin errores nuevos." />
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-lg @4xl:grid-cols-[minmax(0,1fr)_21rem]">
        <Panel
          titulo="Equipo"
          subtitulo="Lo que movió cada persona en el período"
          onIr={() => onNavigate('historial-iris')}
          irLabel="Ver el historial de IRIS"
          padding="none"
        >
          {!data ? (
            <div className="mx-lg mb-lg h-40 animate-pulse rounded-xxl bg-background-subtle" />
          ) : data.porPersona.length === 0 ? (
            <p className="px-lg pb-lg text-bodySmall text-gray-medium">
              Nadie asignó ni corrigió errores en este período.
            </p>
          ) : (
            <ul className="flex flex-col gap-xs px-sm pb-sm">
              {data.porPersona.map((p) => (
                <li
                  key={p.usuarioId}
                  className="grid grid-cols-[2.5rem_minmax(0,1fr)_repeat(3,4.5rem)] items-center gap-md rounded-full px-sm py-sm transition-colors hover:bg-background-subtle"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-lightest text-bodySmall font-semibold text-primary-dark">
                    {iniciales(p.nombre)}
                  </span>
                  <span className="truncate text-body font-semibold text-gray-darkest">
                    {p.nombre}
                  </span>
                  <Cifra valor={p.asignaciones} label="asignados" />
                  <Cifra valor={p.correcciones} label="corregidos" />
                  <Cifra valor={p.resoluciones} label="resueltos" />
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <button
          type="button"
          onClick={() => onNavigate('bandeja')}
          className="group relative flex cursor-pointer flex-col justify-between gap-lg overflow-hidden rounded-xxl bg-[linear-gradient(160deg,#14532d,#0b2e18)] p-lg text-left text-white shadow-lift transition-transform duration-200 hover:-translate-y-0.5"
        >
          <span
            aria-hidden
            className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full border-[32px] border-white/[0.05]"
          />
          <span className="relative flex items-start justify-between gap-md">
            <span className="flex flex-col gap-xxs">
              <span className="text-caption font-semibold tracking-wide text-brand-limeSoft uppercase">
                Ahora en la bandeja
              </span>
              <span className="text-h3 font-semibold">
                {data ? `${data.ahora.abiertos} abiertos` : '—'}
              </span>
            </span>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/25 transition-all duration-200 group-hover:bg-white group-hover:text-primary-dark">
              <ArrowUpRightIcon className="h-4 w-4 transition-transform duration-200 group-hover:rotate-45" />
            </span>
          </span>
          <span className="relative grid grid-cols-2 gap-sm">
            <DatoOscuro
              valor={data?.ahora.sinResponsable}
              label="sin responsable"
            />
            <DatoOscuro valor={data?.ahora.reprocesando} label="reprocesando" />
          </span>
          <span className="relative inline-flex items-center gap-xs text-bodySmall font-semibold text-brand-lime">
            <InboxIcon className="h-4 w-4" />
            Ir a la bandeja de errores
          </span>
        </button>
      </div>
    </AppLayout>
  )
}

function duracion(minutos: number | null | undefined): string {
  return minutos == null ? '—' : formatDuracion(minutos)
}

function Leyenda({
  color,
  label,
  valor,
  rayada = false,
}: {
  color: string
  label: string
  valor: ReactNode
  rayada?: boolean
}) {
  return (
    <li className="flex items-center justify-between gap-md rounded-full bg-background-subtle py-xs pr-md pl-sm">
      <span className="flex items-center gap-sm text-bodySmall text-gray-dark">
        <span
          aria-hidden
          style={
            rayada
              ? {
                  backgroundImage: `repeating-linear-gradient(135deg, ${color} 0 2px, transparent 2px 5px)`,
                }
              : { backgroundColor: color }
          }
          className="h-3 w-3 rounded-full"
        />
        {label}
      </span>
      <span className="text-body font-semibold text-gray-darkest tabular-nums">
        {valor}
      </span>
    </li>
  )
}

function Hito({
  numero,
  titulo,
  valor,
  tenue = false,
  final = false,
}: {
  numero: number
  titulo: string
  valor: string
  tenue?: boolean
  final?: boolean
}) {
  return (
    <li className="relative flex items-center gap-md">
      <span
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-bodySmall font-semibold',
          final
            ? 'bg-primary-default text-white shadow-[0_8px_20px_-8px_rgba(22,163,74,0.7)]'
            : 'bg-primary-lightest text-primary-dark ring-4 ring-background-surface',
        )}
      >
        {numero}
      </span>
      <span className="flex min-w-0 flex-1 items-center justify-between gap-sm rounded-full bg-background-subtle py-sm pr-md pl-md">
        <span className="truncate text-bodySmall font-semibold text-gray-dark">
          {titulo}
        </span>
        <span
          className={cn(
            'text-body font-semibold whitespace-nowrap tabular-nums',
            tenue ? 'text-gray-default' : 'text-gray-darkest',
          )}
        >
          {valor}
        </span>
      </span>
    </li>
  )
}

/** Barras horizontales de llegadas (rayadas) y resoluciones (llenas). */
function Grupos({
  grupos,
  vacio = 'Sin movimiento.',
}: {
  grupos: GrupoMetricas[] | undefined
  vacio?: string
}) {
  if (!grupos) {
    return (
      <div className="h-40 animate-pulse rounded-xxl bg-background-subtle" />
    )
  }
  const max = Math.max(
    1,
    ...grupos.map((g) => Math.max(g.llegadas, g.resoluciones)),
  )
  if (grupos.every((g) => g.llegadas + g.resoluciones === 0)) {
    return <p className="text-bodySmall text-gray-medium">{vacio}</p>
  }

  return (
    <div className="flex flex-col gap-md">
      <ul className="flex flex-col gap-md">
        {grupos.map((g) => (
          <li key={g.id} className="flex flex-col gap-xs">
            <span className="flex items-baseline justify-between gap-sm">
              <span className="truncate text-bodySmall font-semibold text-gray-dark">
                {g.label}
              </span>
              <span className="shrink-0 text-caption text-gray-medium tabular-nums">
                <b className="text-gray-darkest">{g.llegadas}</b> llegaron ·{' '}
                <b className="text-gray-darkest">{g.resoluciones}</b> resueltos
              </span>
            </span>
            <span className="flex flex-col gap-[3px]">
              <span
                aria-hidden
                style={{
                  width: `${(g.llegadas / max) * 100}%`,
                  backgroundImage: `repeating-linear-gradient(135deg, ${colors.primary.default}55 0 2px, transparent 2px 6px)`,
                }}
                className={cn(
                  'block h-2.5 rounded-full bg-primary-lightest transition-[width] duration-500',
                  g.llegadas > 0 && 'min-w-1',
                )}
              />
              <span
                aria-hidden
                style={{ width: `${(g.resoluciones / max) * 100}%` }}
                className={cn(
                  'block h-2.5 rounded-full bg-primary-default transition-[width] duration-500',
                  g.resoluciones > 0 && 'min-w-1',
                )}
              />
            </span>
          </li>
        ))}
      </ul>
      <span className="flex gap-md text-caption text-gray-medium">
        <span className="inline-flex items-center gap-xs">
          <span
            aria-hidden
            style={{
              backgroundImage: `repeating-linear-gradient(135deg, ${colors.primary.default}88 0 2px, transparent 2px 5px)`,
            }}
            className="h-2.5 w-4 rounded-full bg-primary-lightest"
          />
          Llegaron
        </span>
        <span className="inline-flex items-center gap-xs">
          <span
            aria-hidden
            className="h-2.5 w-4 rounded-full bg-primary-default"
          />
          Resueltos
        </span>
      </span>
    </div>
  )
}

function Cifra({ valor, label }: { valor: number; label: string }) {
  return (
    <span className="flex flex-col items-end">
      <span className="text-body font-semibold text-gray-darkest tabular-nums">
        {valor}
      </span>
      <span className="text-caption text-gray-medium">{label}</span>
    </span>
  )
}

function DatoOscuro({
  valor,
  label,
}: {
  valor: number | undefined
  label: string
}) {
  return (
    <span className="flex flex-col gap-xxs rounded-xl bg-white/10 px-md py-sm">
      <span className="text-h3 font-medium tabular-nums">{valor ?? '—'}</span>
      <span className="text-caption text-white/70">{label}</span>
    </span>
  )
}

export default Metricas
