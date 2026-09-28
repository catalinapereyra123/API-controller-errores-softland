import { useMemo, useState } from 'react'
import Card from '../components/Card'
import Dropdown, { type DropdownOption } from '../components/Dropdown'
import FiltrosPopover from '../components/FiltrosPopover'
import {
  MessageIcon,
  RefreshIcon,
  SearchIcon,
  TrendingUpIcon,
  UsersIcon,
  XIcon,
} from '../components/icons'
import AppLayout from '../components/AppLayout'
import Input from '../components/Input'
import StatCard from '../components/StatCard'
import Tabs, { type TabItem } from '../components/Tabs'
import Timeline from '../components/Timeline'
import { historialToTimelineItems } from '../constants/trazabilidad'
import { useHistorial } from '../hooks/useHistorial'
import { colors, fontWeight, textStyles } from '../styles'
import type { AppPage } from '../types'

// El período lo resuelve el back (también cambia los contadores de arriba).
const PERIODOS: TabItem[] = [
  { id: '1', label: 'Hoy' },
  { id: '7', label: 'Últimos 7 días' },
  { id: '30', label: 'Últimos 30 días' },
  { id: '90', label: 'Últimos 90 días' },
]

const TIPO_OPTIONS: DropdownOption[] = [
  { value: 'todos', label: 'Tipo: Todos' },
  { value: 'error', label: 'Tipo: Errores' },
  { value: 'asignacion', label: 'Tipo: Asignaciones' },
  { value: 'observacion', label: 'Tipo: Observaciones' },
  { value: 'reproceso', label: 'Tipo: Reprocesos' },
  { value: 'descarte', label: 'Tipo: Descartes' },
]

interface FiltrosHistorial {
  tipo: string
  empresa: string
}

const FILTROS_INICIALES: FiltrosHistorial = {
  tipo: 'todos',
  empresa: 'todas',
}

function Historial({ onNavigate }: { onNavigate: (page: AppPage) => void }) {
  const [periodo, setPeriodo] = useState('7')
  const [busqueda, setBusqueda] = useState('')
  const [filtros, setFiltros] = useState<FiltrosHistorial>(FILTROS_INICIALES)
  const { resumen, loading, error, refetch } = useHistorial(Number(periodo))

  // Las empresas salen de los eventos que llegaron en el período.
  const empresaOptions: DropdownOption[] = useMemo(() => {
    const nombres = new Set<string>()
    for (const dia of resumen?.dias ?? []) {
      for (const evento of dia.eventos) nombres.add(evento.empresa)
    }
    return [
      { value: 'todas', label: 'Empresa: Todas' },
      ...[...nombres]
        .sort((a, b) => a.localeCompare(b))
        .map((nombre) => ({ value: nombre, label: `Empresa: ${nombre}` })),
    ]
  }, [resumen])

  const filtrosSecundarios: {
    key: keyof FiltrosHistorial
    text: string
    options: DropdownOption[]
  }[] = [
    { key: 'tipo', text: 'Tipo: Todos', options: TIPO_OPTIONS },
    { key: 'empresa', text: 'Empresa: Todas', options: empresaOptions },
  ]

  const filtrosActivos = filtrosSecundarios.filter(
    ({ key }) => filtros[key] !== FILTROS_INICIALES[key],
  )

  // Tipo, empresa y búsqueda se filtran acá; los días que quedan vacíos se
  // ocultan.
  const diasFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()
    return (resumen?.dias ?? [])
      .map((dia) => ({
        ...dia,
        eventos: dia.eventos.filter(
          (evento) =>
            (filtros.tipo === 'todos' || evento.tipo === filtros.tipo) &&
            (filtros.empresa === 'todas' ||
              evento.empresa === filtros.empresa) &&
            (!texto || evento.codigo.toLowerCase().includes(texto)),
        ),
      }))
      .filter((dia) => dia.eventos.length > 0)
  }, [resumen, filtros, busqueda])

  return (
    <AppLayout
      activeItem="historial"
      onNavigate={onNavigate}
      migas={[{ label: 'Inicio', page: 'home' }, { label: 'Historial' }]}
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

      <Tabs
        variant="underline"
        items={PERIODOS}
        value={periodo}
        onChange={setPeriodo}
        activeColor={colors.primary.dark}
        inactiveColor={colors.gray.medium}
        dividerColor={colors.background.border}
      />

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

      <div className="flex flex-wrap items-stretch gap-sm">
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
          placeholder="Buscar por ID..."
          value={busqueda}
          onChange={(event) => setBusqueda(event.target.value)}
          className="max-w-[420px] min-w-[220px] flex-1"
        />

        <FiltrosPopover
          activos={filtrosActivos.length}
          onLimpiar={() => setFiltros(FILTROS_INICIALES)}
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
        {filtrosActivos.map(({ key, text, options }) => (
          <span
            key={key}
            className="inline-flex animate-aparecer items-center gap-xs self-center rounded-full bg-primary-lightest py-xxs pr-xxs pl-sm text-bodySmall font-semibold text-primary-dark"
          >
            {options.find((option) => option.value === filtros[key])?.label ??
              text}
            <button
              type="button"
              aria-label={`Quitar filtro ${text.split(':')[0]}`}
              onClick={() =>
                setFiltros((prev) => ({
                  ...prev,
                  [key]: FILTROS_INICIALES[key],
                }))
              }
              className="flex h-5 w-5 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-primary-light"
            >
              <XIcon className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>

      {loading || !resumen ? (
        <Card className="flex items-center justify-center py-xxl">
          <span style={{ ...textStyles.body, color: colors.gray.medium }}>
            Cargando historial…
          </span>
        </Card>
      ) : diasFiltrados.length === 0 ? (
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
            {resumen.dias.length === 0
              ? 'No hubo actividad en este período.'
              : 'No hay eventos que coincidan con los filtros.'}
          </span>
        </Card>
      ) : (
        <div className="flex flex-col gap-lg">
          {diasFiltrados.map((dia) => (
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
                <span className="ml-auto self-center rounded-full bg-background-subtle px-sm py-px text-caption font-bold text-gray-medium tabular-nums">
                  {dia.eventos.length}{' '}
                  {dia.eventos.length === 1 ? 'evento' : 'eventos'}
                </span>
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
