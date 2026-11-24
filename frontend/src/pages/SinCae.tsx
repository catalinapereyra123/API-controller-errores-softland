import { useEffect, useMemo, useState } from 'react'
import AppLayout from '../components/AppLayout'
import ChevronButton from '../components/ChevronButton'
import DiagnosticosSinCae from '../components/DiagnosticosSinCae'
import Dropdown, { type DropdownOption } from '../components/Dropdown'
import { SearchIcon } from '../components/icons'
import PageHeader from '../components/PageHeader'
import Tabs, { type TabItem } from '../components/Tabs'
import { estadoTagByEstado } from '../constants/estados'
import { CLASE_CAE_LABEL } from '../constants/sinCae'
import { getSinCae } from '../services/sinCae.service'
import { getUsuarios } from '../services/usuarios.service'
import { colors } from '../styles'
import type {
  AppPage,
  ClaseCae,
  ErrorTransaccion,
  SinCaeLista,
  Usuario,
} from '../types'
import { cn } from '../utils/cn'
import { formatDate } from '../utils/format'
import { usuarioNombre } from '../utils/labels'

type Indicador = 'todos' | 'trabanPv' | 'masDe2Dias' | 'sinAsignar'

interface Filtros {
  indicador: Indicador
  empresaId: string
  clase: 'todas' | ClaseCae
}

// La pantalla se desmonta al abrir un comprobante: filtros y datos viven a
// nivel módulo para que al volver quede como estaba.
let filtrosGuardados: Filtros = {
  indicador: 'todos',
  empresaId: 'todas',
  clase: 'todas',
}
let datosGuardados: { lista: SinCaeLista; usuarios: Usuario[] } | null = null

const PASA_INDICADOR: Record<Indicador, (e: ErrorTransaccion) => boolean> = {
  todos: () => true,
  trabanPv: (e) => e.sinCae!.trabaPv,
  masDe2Dias: (e) => e.sinCae!.diasSinCae > 2,
  sinAsignar: (e) => e.responsableId === null,
}

function SinCae({
  onNavigate,
  onOpenError,
}: {
  onNavigate: (page: AppPage) => void
  onOpenError: (id: string) => void
}) {
  const [datos, setDatos] = useState(datosGuardados)
  const [error, setError] = useState<string | null>(null)
  const [recarga, setRecarga] = useState(0)
  const [filtros, setFiltrosState] = useState(filtrosGuardados)

  function setFiltros(cambios: Partial<Filtros>) {
    const nuevos = { ...filtros, ...cambios }
    filtrosGuardados = nuevos
    setFiltrosState(nuevos)
  }

  useEffect(() => {
    let cancelado = false
    setError(null)
    Promise.all([getSinCae(), getUsuarios()])
      .then(([lista, usuarios]) => {
        datosGuardados = { lista, usuarios }
        if (!cancelado) setDatos(datosGuardados)
      })
      .catch((e: unknown) => {
        if (!cancelado) {
          setError(
            e instanceof Error
              ? e.message
              : 'No se pudieron cargar los comprobantes sin CAE.',
          )
        }
      })
    return () => {
      cancelado = true
    }
  }, [recarga])

  const items = useMemo(() => datos?.lista.items ?? [], [datos])

  // El indicador y la clase filtran antes que la empresa: así las pestañas
  // cuentan lo que vas a ver al tocarlas.
  const sinFiltroEmpresa = items.filter(
    (e) =>
      PASA_INDICADOR[filtros.indicador](e) &&
      (filtros.clase === 'todas' || e.sinCae!.clase === filtros.clase),
  )
  const visibles =
    filtros.empresaId === 'todas'
      ? sinFiltroEmpresa
      : sinFiltroEmpresa.filter((e) => e.empresaId === filtros.empresaId)

  const empresaTabs: TabItem[] = useMemo(() => {
    const porEmpresa = new Map<string, { nombre: string; n: number }>()
    for (const e of sinFiltroEmpresa) {
      porEmpresa.set(e.empresaId, {
        nombre: e.empresaNombre,
        n: (porEmpresa.get(e.empresaId)?.n ?? 0) + 1,
      })
    }
    return [
      { id: 'todas', label: 'Todas', badge: sinFiltroEmpresa.length },
      ...[...porEmpresa.entries()]
        .sort((a, b) => a[1].nombre.localeCompare(b[1].nombre))
        .map(([id, { nombre, n }]) => ({ id, label: nombre, badge: n })),
    ]
  }, [sinFiltroEmpresa])

  const claseOptions: DropdownOption[] = [
    { value: 'todas', label: 'Clase: Todas' },
    ...(Object.keys(CLASE_CAE_LABEL) as ClaseCae[]).map((clase) => ({
      value: clase,
      label: `Clase: ${CLASE_CAE_LABEL[clase]}`,
    })),
  ]

  const indicadores = datos?.lista.indicadores
  const tarjetas: { id: Indicador; label: string; valor?: number }[] = [
    { id: 'todos', label: 'Total sin CAE', valor: indicadores?.total },
    { id: 'trabanPv', label: 'Traban un PV', valor: indicadores?.trabanPv },
    {
      id: 'masDe2Dias',
      label: 'Más de 2 días',
      valor: indicadores?.masDe2Dias,
    },
    { id: 'sinAsignar', label: 'Sin asignar', valor: indicadores?.sinAsignar },
  ]

  return (
    <AppLayout
      activeItem="sin-cae"
      onNavigate={onNavigate}
      recordarScroll="sin-cae"
      migas={[{ label: 'Inicio', page: 'home' }, { label: 'Sin CAE' }]}
    >
      <PageHeader
        eyebrow={
          indicadores
            ? `${indicadores.total} abiertos · ${indicadores.trabanPv} traban un punto de venta`
            : 'Comprobantes sin la autorización de ARCA'
        }
        titulo="Sin CAE"
      />

      {error && (
        <div className="flex items-center justify-between gap-md rounded-xxl border border-label-red-outline bg-label-red-background px-lg py-md text-bodySmall font-semibold text-label-red-text">
          {error}
          <button
            type="button"
            className="underline"
            onClick={() => setRecarga((n) => n + 1)}
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Cada indicador filtra la lista; tocarlo de nuevo vuelve a "todos". */}
      <div className="grid grid-cols-2 gap-sm @3xl:grid-cols-4 @3xl:gap-md">
        {tarjetas.map((t) => {
          const activo = filtros.indicador === t.id
          return (
            <button
              key={t.id}
              type="button"
              aria-pressed={activo}
              onClick={() => setFiltros({ indicador: activo ? 'todos' : t.id })}
              className={cn(
                'flex cursor-pointer flex-col gap-xxs rounded-xxl bg-background-surface p-md text-left shadow-soft ring-1 transition-all hover:-translate-y-0.5',
                activo
                  ? 'ring-2 ring-primary-default'
                  : 'ring-slate-900/[0.04]',
              )}
            >
              <span className="text-bodySmall font-semibold text-gray-medium">
                {t.label}
              </span>
              <span
                className={cn(
                  'text-h2 font-medium tabular-nums',
                  t.id === 'trabanPv' && (t.valor ?? 0) > 0
                    ? 'text-label-red-text'
                    : 'text-gray-darkest',
                )}
              >
                {t.valor ?? '—'}
              </span>
            </button>
          )
        })}
      </div>

      <div className="flex flex-col gap-md">
        <Tabs
          variant="underline"
          items={empresaTabs}
          value={filtros.empresaId}
          onChange={(id) => setFiltros({ empresaId: id })}
          activeColor={colors.primary.dark}
          inactiveColor={colors.gray.medium}
          dividerColor={colors.background.border}
        />
        <div className="flex flex-wrap items-center gap-sm">
          <Dropdown
            text="Clase: Todas"
            options={claseOptions}
            color={colors.background.border}
            textColor={colors.gray.dark}
            backgroundColor={colors.background.surface}
            value={filtros.clase}
            onChange={(value) =>
              setFiltros({ clase: value as Filtros['clase'] })
            }
          />
          <span className="text-caption text-gray-medium">
            Primero los que traban un punto de venta; después, los que llevan
            más días.
          </span>
        </div>
      </div>

      <div className="@container w-full rounded-xxl bg-background-surface p-md shadow-soft ring-1 ring-slate-900/[0.04]">
        {!datos ? (
          <div className="flex flex-col gap-sm">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-20 animate-pulse rounded-2xl bg-background-subtle"
              />
            ))}
          </div>
        ) : visibles.length === 0 ? (
          <div className="flex flex-col items-center gap-sm px-lg py-xxl text-center text-body text-gray-medium">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-background-subtle text-gray-default">
              <SearchIcon className="h-5 w-5" />
            </span>
            {items.length === 0
              ? 'No hay comprobantes sin CAE abiertos.'
              : 'No hay comprobantes que coincidan con los filtros.'}
          </div>
        ) : (
          <div className="flex flex-col gap-sm">
            {visibles.map((e) => (
              <FilaSinCae
                key={e.id}
                error={e}
                usuarios={datos.usuarios}
                onOpen={() => onOpenError(e.id)}
              />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}

/** Un comprobante: qué es, por qué no tiene CAE, cuánto lleva y quién lo ve. */
function FilaSinCae({
  error,
  usuarios,
  onOpen,
}: {
  error: ErrorTransaccion
  usuarios: Usuario[]
  onOpen: () => void
}) {
  const sinCae = error.sinCae!
  const EstadoTag = estadoTagByEstado[error.estado]
  const responsable = usuarioNombre(usuarios, error.responsableId)

  return (
    <div
      onClick={onOpen}
      className="group grid cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-md rounded-2xl bg-background-surface px-md py-md ring-1 ring-background-border transition-all hover:bg-primary-lightest/40 hover:shadow-soft hover:ring-primary-light @4xl:grid-cols-[minmax(11rem,1.1fr)_minmax(0,1.6fr)_6rem_9rem_auto]"
    >
      <span className="flex min-w-0 flex-col gap-xxs">
        <span className="font-mono text-body font-semibold text-gray-darkest">
          {error.codigo}
        </span>
        <span className="truncate text-bodySmall text-gray-medium">
          {error.empresaNombre}
          {sinCae.clase && ` · ${CLASE_CAE_LABEL[sinCae.clase]}`}
          {error.fechaMovimiento && ` · ${formatDate(error.fechaMovimiento)}`}
        </span>
      </span>

      <span className="col-span-2 row-start-2 flex flex-wrap items-center gap-sm @4xl:col-span-1 @4xl:row-start-auto">
        <EstadoTag />
        <DiagnosticosSinCae diagnosticos={sinCae.diagnosticos} />
      </span>

      <span className="hidden flex-col items-end @4xl:flex">
        <span className="text-body font-semibold text-gray-darkest tabular-nums">
          {sinCae.diasSinCae}
        </span>
        <span className="text-caption text-gray-medium">
          {sinCae.diasSinCae === 1 ? 'día' : 'días'} sin CAE
        </span>
      </span>

      <span className="hidden @4xl:block">
        {responsable ? (
          <span className="text-bodySmall font-semibold text-gray-darkest">
            {responsable}
          </span>
        ) : (
          <span className="rounded-full bg-background-subtle px-sm py-xxs text-caption font-semibold text-gray-medium">
            Sin asignar
          </span>
        )}
      </span>

      <ChevronButton
        color={colors.primary.dark}
        borderColor={colors.background.border}
        aria-label={`Abrir ${error.codigo}`}
        onClick={(event) => {
          event.stopPropagation()
          onOpen()
        }}
        className="col-start-2 row-start-1 justify-self-end @4xl:col-start-auto @4xl:row-start-auto"
      />
    </div>
  )
}

export default SinCae
