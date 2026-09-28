import { useMemo } from 'react'
import Button from '../components/Button'
import ChevronButton from '../components/ChevronButton'
import Dropdown, { type DropdownOption } from '../components/Dropdown'
import FiltrosPopover from '../components/FiltrosPopover'
import { PlusIcon, SearchIcon, XIcon } from '../components/icons'
import Input from '../components/Input'
import AppLayout from '../components/AppLayout'
import Table from '../components/Table'
import Tabs, { type TabItem } from '../components/Tabs'
import { cn } from '../utils/cn'
import {
  ESTADOS_CERRADOS,
  estadoLabels,
  estadoOrder,
  estadoTagByEstado,
} from '../constants/estados'
import {
  FILTROS_INICIALES,
  useBandejaErrores,
  type BandejaFilters,
} from '../hooks/useBandejaErrores'
import { colors, fontFamily, fontWeight, textStyles } from '../styles'
import type { AppPage, ErrorTransaccion, Usuario } from '../types'
import { usuarioNombre } from '../utils/labels'
import { formatDetectedAt, formatElapsedSince } from '../utils/format'

const BANDEJA_GRID_COLS =
  'grid-cols-[150px_100px_minmax(120px,1fr)_minmax(110px,1fr)_minmax(130px,1fr)_minmax(110px,1fr)_minmax(90px,1fr)_80px_56px]'

const BANDEJA_COLUMNS = [
  'Estado',
  'ID',
  'Empresa',
  'Proceso',
  'Responsable',
  'Detectado',
  'Abierto',
  'Intentos',
  '',
]

function BandejaTableHeader() {
  return (
    <div
      style={{
        backgroundColor: colors.background.subtle,
        borderColor: colors.background.border,
      }}
      className={`grid ${BANDEJA_GRID_COLS} min-w-[1100px] gap-md border-b px-lg py-sm`}
    >
      {BANDEJA_COLUMNS.map((label, index) => (
        <span
          key={label || index}
          style={{
            ...textStyles.overline,
            fontWeight: fontWeight.semibold,
            color: colors.gray.medium,
          }}
          className={cn('uppercase', label === 'Intentos' && 'text-center')}
        >
          {label}
        </span>
      ))}
    </div>
  )
}

function BandejaRow({
  error,
  usuarios,
  onOpen,
}: {
  error: ErrorTransaccion
  usuarios: Usuario[]
  onOpen: () => void
}) {
  const EstadoTag = estadoTagByEstado[error.estado]
  const responsable = usuarioNombre(usuarios, error.responsableId)

  return (
    <div
      onClick={onOpen}
      style={{ borderColor: colors.background.border }}
      className={`group grid ${BANDEJA_GRID_COLS} min-w-[1100px] cursor-pointer items-start gap-md border-b px-lg py-md transition-colors last:border-b-0 hover:bg-background-page`}
    >
      <div className="flex flex-col gap-xxs">
        <EstadoTag />
        {error.estado === 'REPROCESANDO' && (
          <span
            style={{ ...textStyles.caption, color: colors.label.purple.text }}
          >
            Esperando resultado
          </span>
        )}
      </div>
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
      >
        {error.empresaNombre}
      </span>
      <span style={{ ...textStyles.bodySmall, color: colors.gray.medium }}>
        {error.modulo}
      </span>
      {responsable ? (
        <span
          style={{
            ...textStyles.bodySmall,
            fontWeight: fontWeight.bold,
            color: colors.gray.darkest,
          }}
        >
          {responsable}
        </span>
      ) : (
        <span
          style={{
            ...textStyles.bodySmall,
            fontWeight: fontWeight.bold,
            color: colors.status.error,
          }}
        >
          Sin asignar
        </span>
      )}
      <span style={{ ...textStyles.bodySmall, color: colors.gray.medium }}>
        {formatDetectedAt(error.abiertoDesde)}
      </span>
      <span
        style={{
          ...textStyles.bodySmall,
          fontWeight: fontWeight.semibold,
          color: colors.gray.darkest,
        }}
      >
        {ESTADOS_CERRADOS.includes(error.estado)
          ? '—'
          : formatElapsedSince(error.abiertoDesde)}
      </span>
      <span
        style={{ ...textStyles.bodySmall, color: colors.gray.medium }}
        className="text-center"
      >
        {error.intentos}
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

function BandejaErrores({
  onNavigate,
  onOpenError,
}: {
  onNavigate: (page: AppPage) => void
  onOpenError: (id: string) => void
}) {
  const {
    data,
    erroresFiltrados,
    conteoPorEmpresa,
    loading,
    error,
    refetch,
    filters,
    setFilters,
  } = useBandejaErrores()

  // Los módulos salen de los errores que llegaron: se filtra por código
  // (FACTURACION, COMPRAS…) y se muestra la etiqueta legible.
  const modulos = useMemo(() => {
    const porCodigo = new Map<string, string>()
    for (const item of data?.errores ?? []) {
      porCodigo.set(item.moduloCodigo, item.modulo)
    }
    return [...porCodigo.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [data])

  // La empresa va a la vista como pestañas; el resto, detrás de "Filtros".
  const empresaTabs: TabItem[] = [
    { id: 'todas', label: 'Todas', badge: conteoPorEmpresa.todas ?? 0 },
    ...(data?.empresas ?? []).map((empresa) => ({
      id: empresa.id,
      label: empresa.nombre,
      badge: conteoPorEmpresa[empresa.id] ?? 0,
    })),
  ]

  const moduloOptions: DropdownOption[] = [
    { value: 'todos', label: 'Proceso: Todos' },
    ...modulos.map(([codigo, label]) => ({
      value: codigo,
      label: `Proceso: ${label}`,
    })),
  ]

  const estadoOptions: DropdownOption[] = [
    { value: 'abiertos', label: 'Estado: Abiertos' },
    { value: 'todos', label: 'Estado: Todos' },
    ...estadoOrder.map((estado) => ({
      value: estado,
      label: `Estado: ${estadoLabels[estado]}`,
    })),
  ]

  const responsableOptions: DropdownOption[] = [
    { value: 'todos', label: 'Responsable: Todos' },
    { value: 'sin-asignar', label: 'Responsable: Sin asignar' },
    ...(data?.usuarios ?? []).map((usuario) => ({
      value: usuario.id,
      label: `Responsable: ${usuario.nombre}`,
    })),
  ]

  const periodoOptions: DropdownOption[] = [
    { value: 'todos', label: 'Fecha: Todo el historial' },
    { value: '24h', label: 'Fecha: Últimas 24 horas' },
    { value: '7d', label: 'Fecha: Últimos 7 días' },
    { value: '30d', label: 'Fecha: Últimos 30 días' },
  ]

  const filtrosSecundarios: {
    key: Exclude<keyof BandejaFilters, 'busqueda' | 'empresaId'>
    text: string
    options: DropdownOption[]
  }[] = [
    { key: 'modulo', text: 'Proceso: Todos', options: moduloOptions },
    {
      key: 'responsableId',
      text: 'Responsable: Todos',
      options: responsableOptions,
    },
    {
      key: 'periodo',
      text: 'Fecha: Todo el historial',
      options: periodoOptions,
    },
    { key: 'estado', text: 'Estado: Abiertos', options: estadoOptions },
  ]

  const filtrosActivos = filtrosSecundarios.filter(
    ({ key }) => filters[key] !== FILTROS_INICIALES[key],
  )

  function limpiarFiltros() {
    setFilters(
      Object.fromEntries(
        filtrosSecundarios.map(({ key }) => [key, FILTROS_INICIALES[key]]),
      ),
    )
  }

  return (
    <AppLayout
      activeItem="bandeja"
      onNavigate={onNavigate}
      migas={[
        { label: 'Inicio', page: 'home' },
        { label: 'Bandeja de errores' },
      ]}
    >
      <div className="flex flex-wrap items-start justify-between gap-md">
        <h1 style={{ ...textStyles.h1, color: colors.gray.darkest }}>
          Bandeja de errores
        </h1>
        <Button
          text="Registrar seguimiento manual"
          color={colors.primary.default}
          icon={<PlusIcon className="h-4 w-4" />}
          size={{ ...textStyles.bodySmall, fontWeight: fontWeight.bold }}
          className="px-lg py-sm"
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

      <div className="flex flex-col gap-md">
        <Tabs
          variant="underline"
          items={empresaTabs}
          value={filters.empresaId}
          onChange={(id) => setFilters({ empresaId: id })}
          activeColor={colors.primary.dark}
          inactiveColor={colors.gray.medium}
          dividerColor={colors.background.border}
        />

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
            value={filters.busqueda}
            onChange={(event) => setFilters({ busqueda: event.target.value })}
            className="max-w-[420px] min-w-[220px] flex-1"
          />

          <FiltrosPopover
            activos={filtrosActivos.length}
            onLimpiar={limpiarFiltros}
          >
            {filtrosSecundarios.map(({ key, text, options }) => (
              <Dropdown
                key={key}
                text={text}
                options={options}
                color={colors.background.border}
                textColor={colors.gray.dark}
                backgroundColor={colors.background.surface}
                value={filters[key]}
                onChange={(value) => setFilters({ [key]: value })}
              />
            ))}
          </FiltrosPopover>

          {/* Filtros aplicados a la vista, cada uno se saca con su cruz. */}
          {filtrosActivos.map(({ key, text, options }) => (
            <span
              key={key}
              className="inline-flex animate-aparecer items-center gap-xs self-center rounded-full bg-primary-lightest py-xxs pr-xxs pl-sm text-bodySmall font-semibold text-primary-dark"
            >
              {options.find((option) => option.value === filters[key])?.label ??
                text}
              <button
                type="button"
                aria-label={`Quitar filtro ${text.split(':')[0]}`}
                onClick={() => setFilters({ [key]: FILTROS_INICIALES[key] })}
                className="flex h-5 w-5 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-primary-light"
              >
                <XIcon className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      </div>

      {loading || !data ? (
        <Table
          title="Bandeja de errores"
          subtitle="Cargando transacciones…"
          actionText=""
          actionColor={colors.primary.dark}
          rows={6}
          columns={9}
          backgroundColor={colors.background.surface}
          titleColor={colors.gray.darkest}
          subtitleColor={colors.gray.medium}
          dividerColor={colors.background.border}
          cellPlaceholderColor={colors.background.page}
        />
      ) : (
        <div
          style={{ backgroundColor: colors.background.surface }}
          className="w-full overflow-x-auto rounded-xl shadow-soft ring-1 ring-slate-900/5"
        >
          <BandejaTableHeader />
          {erroresFiltrados.length === 0 ? (
            <div
              style={{ ...textStyles.body, color: colors.gray.medium }}
              className="flex flex-col items-center gap-sm px-lg py-xxl text-center"
            >
              <span
                style={{
                  color: colors.gray.default,
                  backgroundColor: colors.background.subtle,
                }}
                className="flex h-12 w-12 items-center justify-center rounded-full"
              >
                <SearchIcon className="h-5 w-5" />
              </span>
              No hay transacciones que coincidan con los filtros.
            </div>
          ) : (
            <div>
              {erroresFiltrados.map((item) => (
                <BandejaRow
                  key={item.id}
                  error={item}
                  usuarios={data.usuarios}
                  onOpen={() => onOpenError(item.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </AppLayout>
  )
}

export default BandejaErrores
