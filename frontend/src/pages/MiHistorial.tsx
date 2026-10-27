import { useEffect, useState, type ReactNode } from 'react'
import { useAuth } from '../auth/useAuth'
import Button from '../components/Button'
import Card from '../components/Card'
import ChevronButton from '../components/ChevronButton'
import CierresLista from '../components/CierresLista'
import {
  ChevronRightIcon,
  InboxIcon,
  RefreshIcon,
  SearchIcon,
  XIcon,
} from '../components/icons'
import LineChart from '../components/LineChart'
import Tabs, { type TabItem } from '../components/Tabs'
import { estadoTagByEstado } from '../constants/estados'
import { useMiEspacio } from '../hooks/useMiEspacio'
import { colors, fontWeight, spacing, textStyles } from '../styles'
import type { AppPage, ErrorTransaccion, ModuloCodigo } from '../types'
import { cn } from '../utils/cn'
import { formatDetectedAt, formatDuracion, minutesSince } from '../utils/format'

const PERIODOS: TabItem[] = [
  { id: '7', label: '7 días' },
  { id: '30', label: '30 días' },
  { id: '90', label: '90 días' },
]

/** Tono suave de cada módulo (las tarjetas de color de arriba a la derecha). */
const TONO_MODULO: Record<
  ModuloCodigo,
  { background: string; text: string; outline: string }
> = {
  FACTURACION: colors.label.purple,
  COMPRAS: colors.label.green,
  COBRANZAS: colors.label.orange,
}

function AsignadoFila({
  error,
  onOpen,
}: {
  error: ErrorTransaccion
  onOpen: () => void
}) {
  const EstadoTag = estadoTagByEstado[error.estado]

  return (
    <div
      onClick={onOpen}
      style={{ borderColor: colors.background.border }}
      className="group grid min-w-[680px] cursor-pointer grid-cols-[124px_minmax(140px,1.2fr)_minmax(110px,1fr)_96px_72px_40px] items-center gap-md border-t px-lg py-md transition-colors hover:bg-background-page"
    >
      <EstadoTag />
      <div className="flex min-w-0 flex-col">
        <span className="truncate font-mono text-body font-semibold text-gray-darkest">
          {error.codigo}
        </span>
        <span className="truncate text-bodySmall text-gray-medium">
          {error.descripcion}
        </span>
      </div>
      <span className="truncate text-bodySmall font-semibold text-gray-dark">
        {error.empresaNombre}
      </span>
      <span className="truncate text-bodySmall text-gray-medium">
        {error.modulo}
      </span>
      <span
        title={`Detectado el ${formatDetectedAt(error.abiertoDesde)}`}
        className="text-bodySmall font-semibold text-gray-dark tabular-nums"
      >
        {formatDuracion(minutesSince(error.abiertoDesde))}
      </span>
      <ChevronButton
        color={colors.primary.dark}
        borderColor={colors.background.border}
        aria-label={`Abrir ${error.codigo}`}
        onClick={(event) => {
          event.stopPropagation()
          onOpen()
        }}
        className="justify-self-end"
      />
    </div>
  )
}

/** Aro de progreso para la efectividad (0–100). */
function Aro({ porcentaje }: { porcentaje: number | null }) {
  const radio = 34
  const perimetro = 2 * Math.PI * radio
  const lleno = ((porcentaje ?? 0) / 100) * perimetro

  return (
    <div className="relative h-[88px] w-[88px] shrink-0">
      <svg viewBox="0 0 88 88" className="h-full w-full -rotate-90">
        <circle
          cx="44"
          cy="44"
          r={radio}
          fill="none"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth="8"
        />
        <circle
          cx="44"
          cy="44"
          r={radio}
          fill="none"
          stroke={colors.brand.lime}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${lleno} ${perimetro}`}
          className="transition-[stroke-dasharray] duration-500"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-h3 font-medium text-white">
        {porcentaje === null ? '—' : `${porcentaje}%`}
      </span>
    </div>
  )
}

function DatoOscuro({ label, valor }: { label: string; valor: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-md border-t border-white/10 py-sm">
      <span className="text-bodySmall text-white/70">{label}</span>
      <span className="text-body font-semibold text-white tabular-nums">
        {valor}
      </span>
    </div>
  )
}

// Al abrir un error la pantalla se desmonta: período, lista y módulo quedan
// acá para que "Volver a mi espacio" la deje como estaba.
let estadoGuardado: {
  periodo: string
  lista: string
  modulo: ModuloCodigo | null
} = { periodo: '30', lista: 'asignados', modulo: null }

/** Pestaña "Mi historial" de Historial (lo que antes era Mi espacio). */
export function MiHistorial({
  onNavigate,
  onOpenError,
}: {
  onNavigate: (page: AppPage) => void
  onOpenError: (id: string) => void
}) {
  const { usuario } = useAuth()
  const [periodo, setPeriodo] = useState(estadoGuardado.periodo)
  const [lista, setLista] = useState(estadoGuardado.lista)
  const [modulo, setModulo] = useState(estadoGuardado.modulo)
  const { data, loading, error, refetch } = useMiEspacio(Number(periodo))

  useEffect(() => {
    estadoGuardado = { periodo, lista, modulo }
  }, [periodo, lista, modulo])

  const metricas = data?.metricas
  const serie = data?.serie ?? []
  const asignados = (data?.asignados ?? []).filter(
    (e) => !modulo || e.moduloCodigo === modulo,
  )
  const corregidos = (data?.corregidos ?? []).filter(
    (c) => !modulo || c.moduloCodigo === modulo,
  )
  const moduloActivo = data?.porModulo.find((m) => m.modulo === modulo)

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-md">
        <p className="text-bodySmall font-semibold text-gray-medium">
          {usuario ? `${usuario.nombre.split(' ')[0]}, esto` : 'Esto'} es lo
          tuyo
          {data ? ` · ${data.periodo.toLowerCase()}` : ''}.
        </p>
        <div className="flex items-center gap-sm">
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
          className="flex items-center justify-between gap-md rounded-xxl border px-lg py-md"
        >
          {error}
          <button type="button" className="underline" onClick={refetch}>
            Reintentar
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-lg @4xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        {/* Tu actividad: el número grande y el gráfico. */}
        <Card className="flex flex-col gap-lg">
          <div className="flex flex-wrap items-end justify-between gap-md">
            <div className="flex flex-col gap-xs">
              <span className="text-caption font-semibold tracking-wide text-gray-default uppercase">
                Corregidos por vos
              </span>
              <span className="text-cifra font-medium tracking-tight text-gray-darkest">
                {metricas ? metricas.corregidos : '—'}
              </span>
            </div>
            <div className="flex flex-wrap gap-sm">
              <span className="rounded-full bg-label-green-background px-md py-xs text-bodySmall font-semibold text-label-green-text">
                {metricas ? metricas.resueltos : '—'} resueltos
              </span>
              <span className="rounded-full bg-label-blue-background px-md py-xs text-bodySmall font-semibold text-label-blue-text">
                {metricas ? metricas.esperandoResultado : '—'} esperando
                resultado
              </span>
            </div>
          </div>
          <LineChart
            titulo="Tus errores corregidos y resueltos por día"
            height={220}
            labels={serie.map((p) => p.etiqueta)}
            series={[
              {
                id: 'corregidos',
                label: 'Mandados a reprocesar',
                color: colors.chart.corregidos,
                values: serie.map((p) => p.corregidos),
              },
              {
                id: 'resueltos',
                label: 'Resueltos',
                color: colors.chart.resueltos,
                values: serie.map((p) => p.resueltos),
              },
            ]}
          />
        </Card>

        {/* Por módulo: tarjetas de color suave, clic filtra la tabla. */}
        <div className="flex flex-col gap-md">
          <div className="flex items-baseline justify-between gap-sm">
            <h2 className="text-h3 text-gray-darkest">Por módulo</h2>
            <span className="text-bodySmall text-gray-medium">
              Tocá uno para filtrar
            </span>
          </div>
          <div className="grid flex-1 grid-cols-1 gap-md @xl:grid-cols-3">
            {(data?.porModulo ?? []).map((m) => {
              const tono = TONO_MODULO[m.modulo]
              const activo = modulo === m.modulo
              return (
                <button
                  key={m.modulo}
                  type="button"
                  aria-pressed={activo}
                  onClick={() => setModulo(activo ? null : m.modulo)}
                  style={{
                    backgroundColor: tono.background,
                    outlineColor: tono.outline,
                  }}
                  className={cn(
                    'flex min-h-[188px] cursor-pointer flex-col justify-between gap-lg rounded-xxl p-lg text-left transition-transform duration-150 hover:-translate-y-0.5',
                    activo && 'outline-2 outline-offset-2',
                  )}
                >
                  <span className="flex min-w-0 flex-col items-start gap-sm">
                    <span
                      style={{ color: tono.text }}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-body font-medium shadow-soft rounded-full"
                    >
                      {m.label[0]}
                    </span>
                    <span
                      style={{ color: tono.text }}
                      className="truncate text-bodySmall font-semibold"
                    >
                      {m.label}
                    </span>
                  </span>
                  <div className="flex flex-col gap-xxs">
                    <span className="text-h1 leading-none font-medium text-gray-darkest">
                      {m.asignados}
                    </span>
                    <span className="text-bodySmall text-gray-dark">
                      {m.asignados === 1 ? 'asignado' : 'asignados'}
                    </span>
                    <span
                      style={{ color: tono.text }}
                      className="mt-xs text-bodySmall font-semibold tabular-nums"
                    >
                      +{m.corregidos}{' '}
                      {m.corregidos === 1 ? 'corregido' : 'corregidos'}
                    </span>
                  </div>
                </button>
              )
            })}
            {!data &&
              [0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="min-h-[188px] animate-pulse rounded-xxl bg-background-subtle"
                />
              ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-lg @4xl:grid-cols-[minmax(0,1fr)_21rem]">
        <Card padding="none" className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-md px-lg py-lg">
            <div className="flex flex-wrap items-center gap-sm">
              <h2 className="text-h3 text-gray-darkest">Tus errores</h2>
              {moduloActivo && (
                <span className="inline-flex animate-aparecer items-center gap-xs rounded-full bg-primary-lightest py-xxs pr-xxs pl-sm text-bodySmall font-semibold text-primary-dark">
                  Módulo: {moduloActivo.label}
                  <button
                    type="button"
                    aria-label="Quitar filtro Módulo"
                    onClick={() => setModulo(null)}
                    className="flex h-5 w-5 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-primary-light"
                  >
                    <XIcon className="h-3 w-3" />
                  </button>
                </span>
              )}
            </div>
            <Tabs
              items={[
                {
                  id: 'asignados',
                  label: 'Asignados',
                  badge: data ? asignados.length : undefined,
                },
                {
                  id: 'corregidos',
                  label: 'Corregidos',
                  badge: data ? corregidos.length : undefined,
                },
              ]}
              value={lista}
              onChange={setLista}
              activeColor={colors.gray.darkest}
              inactiveColor={colors.gray.medium}
            />
          </div>

          {loading && !data ? (
            <p className="border-t border-background-border py-xxl text-center text-body text-gray-medium">
              Cargando…
            </p>
          ) : (lista === 'asignados' ? asignados : corregidos).length === 0 ? (
            <div className="flex flex-col items-center gap-sm border-t border-background-border py-xxl text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-background-subtle text-gray-default">
                <SearchIcon className="h-5 w-5" />
              </span>
              <span className="text-body text-gray-medium">
                {lista === 'asignados'
                  ? 'No tenés errores abiertos asignados.'
                  : 'No corregiste errores en este período.'}
              </span>
            </div>
          ) : lista === 'asignados' ? (
            <div className="overflow-x-auto">
              <div
                aria-hidden
                className="grid min-w-[680px] grid-cols-[124px_minmax(140px,1.2fr)_minmax(110px,1fr)_96px_72px_40px] gap-md px-lg py-sm text-overline font-semibold tracking-widest text-gray-default uppercase"
              >
                <span>Estado</span>
                <span>Error</span>
                <span>Empresa</span>
                <span>Módulo</span>
                <span>Abierto</span>
                <span />
              </div>
              {asignados.map((item) => (
                <AsignadoFila
                  key={item.id}
                  error={item}
                  onOpen={() => onOpenError(item.id)}
                />
              ))}
            </div>
          ) : (
            <CierresLista
              cierres={corregidos}
              onOpen={onOpenError}
              mostrarQuien={false}
            />
          )}
        </Card>

        {/* Tarjeta oscura: cómo te va con los reprocesos. */}
        <div className="relative flex flex-col gap-lg overflow-hidden rounded-xxl bg-[linear-gradient(160deg,#14532d,#0b2e18)] p-lg text-white shadow-lift @4xl:sticky @4xl:top-20 @4xl:self-start">
          <span
            aria-hidden
            className="pointer-events-none absolute -top-16 -right-16 h-44 w-44 rounded-full bg-brand-lime/20 blur-3xl"
          />
          <div className="relative flex flex-col gap-xxs">
            <span className="text-caption font-semibold tracking-wide text-brand-limeSoft uppercase">
              Tus reprocesos
            </span>
            <h2 className="text-h3 text-white">
              {metricas?.efectividad == null
                ? 'Todavía sin resultados'
                : metricas.efectividad >= 80
                  ? '¡Vienen saliendo bien!'
                  : 'Efectividad del período'}
            </h2>
          </div>

          <div className="relative flex items-center gap-lg">
            <Aro porcentaje={metricas?.efectividad ?? null} />
            <p className="text-bodySmall text-white/75">
              De los reprocesos que mandaste y ya tienen resultado, cuántos
              quedaron en S en Softland.
            </p>
          </div>

          <div className="relative flex flex-col">
            <DatoOscuro
              label="Tiempo prom. de resolución"
              valor={
                metricas?.resueltos
                  ? formatDuracion(metricas.tiempoPromedioResolucionMinutos)
                  : '—'
              }
            />
            <DatoOscuro
              label="Volvieron con error"
              valor={metricas ? metricas.fallidos : '—'}
            />
            <DatoOscuro
              label="Asignado más viejo"
              valor={
                metricas?.asignadoMasViejoMinutos != null
                  ? `hace ${formatDuracion(metricas.asignadoMasViejoMinutos)}`
                  : '—'
              }
            />
          </div>

          <Button
            text="Ir a la bandeja"
            color={colors.brand.lime}
            onClick={() => onNavigate('bandeja')}
            icon={<InboxIcon className="h-4 w-4" />}
            trailingIcon={<ChevronRightIcon className="h-4 w-4" />}
            size={{
              padding: `${spacing.sm} ${spacing.lg}`,
              ...textStyles.bodySmall,
              fontWeight: fontWeight.semibold,
              color: colors.brand.deep,
            }}
            className="relative self-start rounded-full"
          />
        </div>
      </div>
    </>
  )
}
