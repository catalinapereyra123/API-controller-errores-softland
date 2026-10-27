import { useEffect, useMemo, useState } from 'react'
import Card from '../components/Card'
import CierresLista from '../components/CierresLista'
import Dropdown, { type DropdownOption } from '../components/Dropdown'
import FiltrosPopover from '../components/FiltrosPopover'
import {
  CheckCircleIcon,
  ClockIcon,
  RefreshIcon,
  SearchIcon,
  TrendingUpIcon,
  XIcon,
} from '../components/icons'
import AppLayout from '../components/AppLayout'
import PageHeader from '../components/PageHeader'
import Button from '../components/Button'
import Input from '../components/Input'
import LineChart from '../components/LineChart'
import StatCard from '../components/StatCard'
import Tabs, { type TabItem } from '../components/Tabs'
import Timeline from '../components/Timeline'
import { historialToTimelineItems } from '../constants/trazabilidad'
import { useHistorial } from '../hooks/useHistorial'
import { colors, fontWeight, textStyles } from '../styles'
import type { AppPage, ErrorCierre } from '../types'
import { MiHistorial } from './MiHistorial'
import { cn } from '../utils/cn'
import { claveDia, formatDuracion, iniciales } from '../utils/format'

// El período lo resuelve el back (también cambia los contadores de arriba).
const PERIODOS: TabItem[] = [
  { id: '1', label: 'Hoy' },
  { id: '7', label: '7 días' },
  { id: '30', label: '30 días' },
  { id: '90', label: '90 días' },
]

const TIPO_EVENTO_OPTIONS: DropdownOption[] = [
  { value: 'todos', label: 'Tipo: Todos' },
  { value: 'error', label: 'Tipo: Errores' },
  { value: 'asignacion', label: 'Tipo: Asignaciones' },
  { value: 'observacion', label: 'Tipo: Observaciones' },
  { value: 'reproceso', label: 'Tipo: Reprocesos' },
  { value: 'descarte', label: 'Tipo: Descartes' },
]

/** Valor del filtro "Quién" para lo que cerró la verificación automática. */
const AUTOMATICO = '__automatico__'

interface FiltrosHistorial {
  tipoCierre: string
  empresa: string
  modulo: string
  quien: string
  tipoEvento: string
}

const FILTROS_INICIALES: FiltrosHistorial = {
  tipoCierre: 'todos',
  empresa: 'todas',
  modulo: 'todos',
  quien: 'todos',
  tipoEvento: 'todos',
}

type FiltroKey = keyof FiltrosHistorial

const quienDe = (cierre: ErrorCierre) => cierre.cerradoPor ?? AUTOMATICO

/** Opciones "Etiqueta: valor" a partir de los valores que aparecen. */
function opciones(
  etiqueta: string,
  todos: string,
  valores: Iterable<string>,
  label: (valor: string) => string = (valor) => valor,
): DropdownOption[] {
  return [
    { value: todos, label: `${etiqueta}: Todos` },
    ...[...new Set(valores)]
      .sort((a, b) => label(a).localeCompare(label(b)))
      .map((valor) => ({
        value: valor,
        label: `${etiqueta}: ${label(valor)}`,
      })),
  ]
}

const labelQuien = (valor: string) =>
  valor === AUTOMATICO ? 'Verificación automática' : valor

// La pantalla se desmonta al abrir un error: período, pestaña y filtros
// quedan acá para que "Volver al historial" la deje como estaba.
let estadoGuardado: {
  periodo: string
  vista: string
  busqueda: string
  filtros: FiltrosHistorial
  punto: string | null
} = {
  periodo: '7',
  vista: 'cierres',
  busqueda: '',
  filtros: FILTROS_INICIALES,
  punto: null,
}

const VISTAS: TabItem[] = [
  { id: 'mio', label: 'Mi historial' },
  { id: 'iris', label: 'Historial de IRIS' },
]

/**
 * Historial con dos pestañas: lo propio (asignados, corregidos y cómo te
 * fue) y el de todo IRIS. Cada pestaña es una pantalla en el historial del
 * navegador, así "atrás" vuelve a la anterior.
 */
function Historial({
  vista,
  onNavigate,
  onOpenError,
}: {
  vista: 'mio' | 'iris'
  onNavigate: (page: AppPage) => void
  onOpenError: (id: string) => void
}) {
  return (
    <AppLayout
      activeItem="historial"
      onNavigate={onNavigate}
      migas={[
        { label: 'Inicio', page: 'home' },
        {
          label: 'Historial',
          page: vista === 'iris' ? 'historial' : undefined,
        },
        ...(vista === 'iris' ? [{ label: 'IRIS' }] : []),
      ]}
      recordarScroll={vista === 'mio' ? 'historial' : 'historial-iris'}
    >
      <PageHeader
        eyebrow={
          vista === 'mio'
            ? 'Lo que tenés asignado, lo que corregiste y cómo te fue'
            : 'Todo lo que se resolvió, se corrigió y pasó en IRIS'
        }
        titulo="Historial"
        acciones={
          <Tabs
            items={VISTAS}
            value={vista}
            onChange={(id) =>
              onNavigate(id === 'mio' ? 'historial' : 'historial-iris')
            }
            activeColor={colors.gray.darkest}
            inactiveColor={colors.gray.medium}
          />
        }
      />

      {vista === 'mio' ? (
        <MiHistorial onNavigate={onNavigate} onOpenError={onOpenError} />
      ) : (
        <HistorialIris onNavigate={onNavigate} onOpenError={onOpenError} />
      )}
    </AppLayout>
  )
}

function HistorialIris({
  onNavigate,
  onOpenError,
}: {
  onNavigate: (page: AppPage) => void
  onOpenError: (id: string) => void
}) {
  const [periodo, setPeriodo] = useState(estadoGuardado.periodo)
  const [vista, setVista] = useState(estadoGuardado.vista)
  const [busqueda, setBusqueda] = useState(estadoGuardado.busqueda)
  const [filtros, setFiltros] = useState(estadoGuardado.filtros)
  /** Punto del gráfico elegido (id de la serie: día u hora). */
  const [punto, setPunto] = useState(estadoGuardado.punto)
  const { resumen, loading, error, refetch } = useHistorial(Number(periodo))

  useEffect(() => {
    estadoGuardado = { periodo, vista, busqueda, filtros, punto }
  }, [periodo, vista, busqueda, filtros, punto])

  const cierres = useMemo(() => resumen?.cierres ?? [], [resumen])
  const serie = useMemo(() => resumen?.serie ?? [], [resumen])
  const porHora = serie[0]?.id.includes('T') ?? false

  function cambiarPeriodo(id: string) {
    setPeriodo(id)
    setPunto(null)
  }

  // Empresas, módulos y personas salen de lo que llegó en el período.
  const eventos = useMemo(
    () => (resumen?.dias ?? []).flatMap((dia) => dia.eventos),
    [resumen],
  )
  const filtrosSecundarios: {
    key: FiltroKey
    text: string
    options: DropdownOption[]
  }[] =
    vista === 'cierres'
      ? [
          {
            key: 'empresa',
            text: 'Empresa: Todas',
            options: opciones(
              'Empresa',
              'todas',
              cierres.map((c) => c.empresaNombre),
            ),
          },
          {
            key: 'modulo',
            text: 'Módulo: Todos',
            options: opciones(
              'Módulo',
              'todos',
              cierres.map((c) => c.modulo),
            ),
          },
          {
            key: 'quien',
            text: 'Quién: Todos',
            options: opciones(
              'Quién',
              'todos',
              cierres.map(quienDe),
              labelQuien,
            ),
          },
        ]
      : [
          {
            key: 'tipoEvento',
            text: 'Tipo: Todos',
            options: TIPO_EVENTO_OPTIONS,
          },
          {
            key: 'empresa',
            text: 'Empresa: Todas',
            options: opciones(
              'Empresa',
              'todas',
              eventos.map((e) => e.empresa),
            ),
          },
        ]

  const filtrosActivos = filtrosSecundarios.filter(
    ({ key }) => filtros[key] !== FILTROS_INICIALES[key],
  )

  const texto = busqueda.trim().toLowerCase()

  // Todo menos el tipo: así los contadores de las pestañas Todos / Resueltos /
  // Reprocesados reflejan los demás filtros.
  const cierresSinTipo = useMemo(
    () =>
      cierres.filter(
        (c) =>
          (filtros.empresa === 'todas' ||
            c.empresaNombre === filtros.empresa) &&
          (filtros.modulo === 'todos' || c.modulo === filtros.modulo) &&
          (filtros.quien === 'todos' || quienDe(c) === filtros.quien) &&
          (!punto || claveDia(c.fechaCierre, porHora) === punto) &&
          (!texto ||
            c.codigo.toLowerCase().includes(texto) ||
            c.empresaNombre.toLowerCase().includes(texto)),
      ),
    [cierres, filtros, punto, porHora, texto],
  )
  const cierresFiltrados = cierresSinTipo.filter(
    (c) =>
      filtros.tipoCierre === 'todos' || c.tipoCierre === filtros.tipoCierre,
  )
  const cantidadResueltos = cierresSinTipo.filter(
    (c) => c.tipoCierre === 'resuelto',
  ).length

  const diasFiltrados = useMemo(
    () =>
      (resumen?.dias ?? [])
        .map((dia) => ({
          ...dia,
          eventos: dia.eventos.filter(
            (evento) =>
              (filtros.tipoEvento === 'todos' ||
                evento.tipo === filtros.tipoEvento) &&
              (filtros.empresa === 'todas' ||
                evento.empresa === filtros.empresa) &&
              (!texto || evento.codigo.toLowerCase().includes(texto)),
          ),
        }))
        .filter((dia) => dia.eventos.length > 0),
    [resumen, filtros, texto],
  )

  // Quién corrigió más en el período (la verificación automática, aparte).
  const ranking = useMemo(() => {
    const porPersona = new Map<string, { resueltos: number; total: number }>()
    for (const cierre of cierres) {
      const quien = quienDe(cierre)
      const actual = porPersona.get(quien) ?? { resueltos: 0, total: 0 }
      actual.total++
      if (cierre.tipoCierre === 'resuelto') actual.resueltos++
      porPersona.set(quien, actual)
    }
    return [...porPersona.entries()]
      .map(([quien, cuenta]) => ({ quien, ...cuenta }))
      .sort((a, b) => b.total - a.total)
  }, [cierres])
  const maximoRanking = Math.max(1, ...ranking.map((r) => r.total))
  const automaticos = ranking.find((r) => r.quien === AUTOMATICO)?.total ?? 0

  const indicePunto = punto ? serie.findIndex((p) => p.id === punto) : -1

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-md">
        <p className="text-bodySmall font-semibold text-gray-medium">
          Qué se resolvió y qué se mandó a reprocesar
          {resumen ? ` · ${resumen.periodo.toLowerCase()}` : ''}.
        </p>
        <div className="flex items-center gap-sm">
          <Tabs
            items={PERIODOS}
            value={periodo}
            onChange={cambiarPeriodo}
            activeColor={colors.gray.darkest}
            inactiveColor={colors.gray.medium}
          />
          <Button
            text="Ver métricas"
            color={colors.primary.dark}
            variant="outline"
            onClick={() => onNavigate('metricas')}
            className="px-md py-xs text-bodySmall font-semibold"
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

      <div className="grid grid-cols-1 gap-md @sm:grid-cols-2 @sm:gap-lg @5xl:grid-cols-4">
        <StatCard
          label="Resueltos"
          value={resumen ? resumen.resueltos : '—'}
          labelColor={colors.gray.default}
          valueColor={colors.gray.darkest}
          backgroundColor={colors.background.surface}
          icon={<CheckCircleIcon className="h-5 w-5" />}
          iconColor={colors.label.green.text}
          iconBackground={colors.label.green.background}
          trend={{
            text: 'Quedaron en S en Softland',
            color: colors.gray.medium,
          }}
        />
        <StatCard
          label="Mandados a reprocesar"
          value={resumen ? resumen.corregidos : '—'}
          labelColor={colors.gray.default}
          valueColor={colors.gray.darkest}
          backgroundColor={colors.background.surface}
          icon={<RefreshIcon className="h-5 w-5" />}
          iconColor={colors.label.blue.text}
          iconBackground={colors.label.blue.background}
          trend={{
            text: 'Corregidos por el equipo',
            color: colors.gray.medium,
          }}
        />
        <StatCard
          label="Tiempo prom. resolución"
          value={
            resumen ? (
              <span className="whitespace-nowrap">
                {resumen.resueltos
                  ? formatDuracion(resumen.tiempoPromedioResolucionMinutos)
                  : '—'}
              </span>
            ) : (
              '—'
            )
          }
          labelColor={colors.gray.default}
          valueColor={colors.gray.darkest}
          backgroundColor={colors.background.surface}
          icon={<ClockIcon className="h-5 w-5" />}
          iconColor={colors.label.purple.text}
          iconBackground={colors.label.purple.background}
          trend={{
            text: 'De la detección a la resolución',
            color: colors.gray.medium,
          }}
        />
        <StatCard
          label="Cerrados solos"
          value={resumen ? automaticos : '—'}
          labelColor={colors.gray.default}
          valueColor={colors.gray.darkest}
          backgroundColor={colors.background.surface}
          icon={<TrendingUpIcon className="h-5 w-5" />}
          iconColor={colors.label.orange.text}
          iconBackground={colors.label.orange.background}
          trend={{
            text: 'Arreglados fuera de la app',
            color: colors.gray.medium,
          }}
        />
      </div>

      <div className="grid grid-cols-1 gap-lg @4xl:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
        <Card className="flex flex-col gap-md">
          <div className="flex flex-wrap items-start justify-between gap-sm">
            <div className="flex flex-col gap-xxs">
              <h2 className="text-h3 text-gray-darkest">
                {porHora ? 'Hora por hora' : 'Día por día'}
              </h2>
              <p className="text-bodySmall text-gray-medium">
                Tocá un {porHora ? 'horario' : 'día'} para ver sólo esos
                errores.
              </p>
            </div>
          </div>
          <LineChart
            titulo="Errores resueltos y mandados a reprocesar por período"
            labels={serie.map((p) => p.etiqueta)}
            series={[
              {
                id: 'resueltos',
                label: 'Resueltos',
                color: colors.chart.resueltos,
                values: serie.map((p) => p.resueltos),
              },
              {
                id: 'corregidos',
                label: 'Mandados a reprocesar',
                color: colors.chart.corregidos,
                values: serie.map((p) => p.corregidos),
              },
            ]}
            seleccionado={indicePunto >= 0 ? indicePunto : null}
            onSeleccionar={(indice) => {
              setPunto(indice === null ? null : serie[indice].id)
              setVista('cierres')
            }}
          />
        </Card>

        <Card className="flex flex-col gap-md">
          <div className="flex flex-col gap-xxs">
            <h2 className="text-h3 text-gray-darkest">Quién corrigió</h2>
            <p className="text-bodySmall text-gray-medium">
              Resueltos y reprocesados en el período.
            </p>
          </div>
          {ranking.length === 0 ? (
            <p className="py-lg text-center text-bodySmall text-gray-medium">
              {loading
                ? 'Cargando…'
                : 'Nadie corrigió errores en este período.'}
            </p>
          ) : (
            <ul className="flex flex-col gap-xxs">
              {ranking.slice(0, 6).map((fila) => {
                const activo = filtros.quien === fila.quien
                return (
                  <li key={fila.quien}>
                    <button
                      type="button"
                      aria-pressed={activo}
                      onClick={() => {
                        setFiltros((prev) => ({
                          ...prev,
                          quien: activo ? 'todos' : fila.quien,
                        }))
                        setVista('cierres')
                      }}
                      className={cn(
                        'flex w-full cursor-pointer items-center gap-sm rounded-full px-sm py-sm text-left transition-colors',
                        activo
                          ? 'bg-primary-lightest'
                          : 'hover:bg-background-page',
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-caption font-semibold',
                          fila.quien === AUTOMATICO
                            ? 'bg-background-subtle text-gray-medium'
                            : 'bg-primary-lightest text-primary-dark ring-2 ring-white',
                        )}
                      >
                        {fila.quien === AUTOMATICO ? (
                          <RefreshIcon className="h-3.5 w-3.5" />
                        ) : (
                          iniciales(fila.quien)
                        )}
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col gap-xs">
                        <span className="flex items-baseline justify-between gap-sm">
                          <span className="truncate text-bodySmall font-semibold text-gray-dark">
                            {labelQuien(fila.quien)}
                          </span>
                          <span className="text-bodySmall font-semibold text-gray-darkest tabular-nums">
                            {fila.total}
                          </span>
                        </span>
                        {/* Barra: verde lo resuelto, azul lo que sigue en reproceso. */}
                        <span className="flex h-1.5 w-full gap-[2px] overflow-hidden rounded-full bg-background-subtle">
                          {fila.resueltos > 0 && (
                            <span
                              style={{
                                width: `${(fila.resueltos / maximoRanking) * 100}%`,
                                backgroundColor: colors.chart.resueltos,
                              }}
                              className="rounded-full"
                            />
                          )}
                          {fila.total > fila.resueltos && (
                            <span
                              style={{
                                width: `${((fila.total - fila.resueltos) / maximoRanking) * 100}%`,
                                backgroundColor: colors.chart.corregidos,
                              }}
                              className="rounded-full"
                            />
                          )}
                        </span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>
      </div>

      <div className="flex flex-col gap-lg">
        <Tabs
          variant="underline"
          items={[
            {
              id: 'cierres',
              label: 'Resueltos y corregidos',
              badge: resumen ? cierres.length : undefined,
            },
            {
              id: 'actividad',
              label: 'Toda la actividad',
              badge: resumen ? eventos.length : undefined,
            },
          ]}
          value={vista}
          onChange={setVista}
          activeColor={colors.primary.dark}
          inactiveColor={colors.gray.medium}
          dividerColor={colors.background.border}
        />

        <div className="flex flex-wrap items-center gap-sm">
          <Input
            icon={
              <SearchIcon
                className="h-4 w-4"
                style={{ color: colors.gray.default }}
              />
            }
            color={colors.gray.darkest}
            borderColor={colors.background.border}
            backgroundColor={colors.background.surface}
            placeholder={
              vista === 'cierres'
                ? 'Buscar por ID o empresa...'
                : 'Buscar por ID...'
            }
            value={busqueda}
            onChange={(event) => setBusqueda(event.target.value)}
            className="max-w-[22rem] min-w-[13rem] flex-1"
          />

          {vista === 'cierres' && (
            <Tabs
              items={[
                {
                  id: 'todos',
                  label: 'Todos',
                  badge: cierresSinTipo.length,
                },
                {
                  id: 'resuelto',
                  label: 'Resueltos',
                  badge: cantidadResueltos,
                },
                {
                  id: 'corregido',
                  label: 'Reprocesados',
                  badge: cierresSinTipo.length - cantidadResueltos,
                },
              ]}
              value={filtros.tipoCierre}
              onChange={(tipoCierre) =>
                setFiltros((prev) => ({ ...prev, tipoCierre }))
              }
              activeColor={colors.gray.darkest}
              inactiveColor={colors.gray.medium}
            />
          )}

          <FiltrosPopover
            activos={filtrosActivos.length}
            onLimpiar={() =>
              setFiltros((prev) => ({
                ...FILTROS_INICIALES,
                tipoCierre: prev.tipoCierre,
              }))
            }
          >
            {filtrosSecundarios.map(({ key, text, options }) => (
              <Dropdown
                key={key}
                text={text}
                options={options}
                color={colors.background.border}
                textColor={colors.gray.dark}
                backgroundColor={colors.background.surface}
                value={filtros[key]}
                onChange={(value) =>
                  setFiltros((prev) => ({ ...prev, [key]: value }))
                }
              />
            ))}
          </FiltrosPopover>

          {/* Filtros aplicados, cada uno se saca con su cruz. */}
          {vista === 'cierres' && indicePunto >= 0 && (
            <FiltroChip
              texto={`${porHora ? 'Hora' : 'Día'}: ${serie[indicePunto].etiqueta}`}
              onQuitar={() => setPunto(null)}
            />
          )}
          {filtrosActivos.map(({ key, text, options }) => (
            <FiltroChip
              key={key}
              texto={
                options.find((option) => option.value === filtros[key])
                  ?.label ?? text
              }
              onQuitar={() =>
                setFiltros((prev) => ({
                  ...prev,
                  [key]: FILTROS_INICIALES[key],
                }))
              }
            />
          ))}
        </div>

        {!resumen ? (
          <Card className="flex items-center justify-center py-xxl">
            <span style={{ ...textStyles.body, color: colors.gray.medium }}>
              Cargando historial…
            </span>
          </Card>
        ) : vista === 'cierres' ? (
          cierresFiltrados.length === 0 ? (
            <Vacio
              texto={
                cierres.length === 0
                  ? 'No se resolvió ni se corrigió ningún error en este período.'
                  : 'No hay errores que coincidan con los filtros.'
              }
            />
          ) : (
            <CierresLista
              cierres={cierresFiltrados}
              onOpen={onOpenError}
              agruparPorDia
            />
          )
        ) : diasFiltrados.length === 0 ? (
          <Vacio
            texto={
              resumen.dias.length === 0
                ? 'No hubo actividad en este período.'
                : 'No hay eventos que coincidan con los filtros.'
            }
          />
        ) : (
          <div className="flex flex-col gap-lg">
            {diasFiltrados.map((dia) => (
              <Card key={dia.id}>
                <div className="sticky top-16 z-10 -mx-lg -mt-lg mb-md flex items-baseline gap-sm rounded-t-xxl bg-white/90 px-lg pt-lg pb-sm backdrop-blur-md">
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
                  <span className="ml-auto self-center rounded-full bg-background-subtle px-sm py-px text-caption font-semibold text-gray-medium tabular-nums">
                    {dia.eventos.length}{' '}
                    {dia.eventos.length === 1 ? 'evento' : 'eventos'}
                  </span>
                </div>

                <Timeline
                  items={historialToTimelineItems(dia.eventos, onOpenError)}
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
    </>
  )
}

function FiltroChip({
  texto,
  onQuitar,
}: {
  texto: string
  onQuitar: () => void
}) {
  return (
    <span className="inline-flex animate-aparecer items-center gap-xs self-center rounded-full bg-primary-lightest py-xxs pr-xxs pl-sm text-bodySmall font-semibold text-primary-dark">
      {texto}
      <button
        type="button"
        aria-label={`Quitar filtro ${texto.split(':')[0]}`}
        onClick={onQuitar}
        className="flex h-5 w-5 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-primary-light"
      >
        <XIcon className="h-3 w-3" />
      </button>
    </span>
  )
}

function Vacio({ texto }: { texto: string }) {
  return (
    <Card className="flex flex-col items-center gap-sm py-xxl text-center">
      <span
        style={{
          color: colors.gray.default,
          backgroundColor: colors.background.subtle,
        }}
        className="flex h-12 w-12 items-center justify-center rounded-full"
      >
        <SearchIcon className="h-5 w-5" />
      </span>
      <span style={{ ...textStyles.body, color: colors.gray.medium }}>
        {texto}
      </span>
    </Card>
  )
}

export default Historial
