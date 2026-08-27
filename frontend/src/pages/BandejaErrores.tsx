import { useMemo, useState } from 'react'
import Button from '../components/Button'
import ChevronButton from '../components/ChevronButton'
import Dropdown, { type DropdownOption } from '../components/Dropdown'
import { PanelLeftIcon, PlusIcon, SearchIcon } from '../components/icons'
import Input from '../components/Input'
import Sidebar, {
  type SidebarItemId,
  type SidebarNavItem,
} from '../components/Sidebar'
import Table from '../components/Table'
import { cn } from '../utils/cn'
import {
  estadoLabels,
  estadoOrder,
  estadoTagByEstado,
} from '../constants/estados'
import { useBandejaErrores } from '../hooks/useBandejaErrores'
import { colors, fontFamily, fontWeight, textStyles } from '../styles'
import type { AppPage, Empresa, ErrorTransaccion, Usuario } from '../types'
import { empresaLabel, usuarioNombre } from '../utils/labels'
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
      style={{ backgroundColor: colors.background.subtle }}
      className={`grid ${BANDEJA_GRID_COLS} gap-md rounded-t-xl px-lg py-sm`}
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
  empresas,
  usuarios,
  onOpen,
}: {
  error: ErrorTransaccion
  empresas: Empresa[]
  usuarios: Usuario[]
  onOpen: () => void
}) {
  const EstadoTag = estadoTagByEstado[error.estado]
  const responsable = usuarioNombre(usuarios, error.responsableId)

  return (
    <div
      style={{ borderColor: colors.background.border }}
      className={`grid ${BANDEJA_GRID_COLS} items-start gap-md border-b px-lg py-md last:border-b-0`}
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
      >
        {empresaLabel(empresas, error.empresaId)}
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
        {error.estado === 'RESUELTO'
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
        onClick={onOpen}
        className="justify-self-end"
      />
    </div>
  )
}

function BandejaErrores({
  onNavigate,
}: {
  onNavigate: (page: AppPage) => void
}) {
  const {
    data,
    erroresFiltrados,
    loading,
    error,
    refetch,
    filters,
    setFilters,
  } = useBandejaErrores()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activeNavItem, setActiveNavItem] = useState<SidebarItemId>('bandeja')

  function handleSelectNavItem(item: SidebarNavItem) {
    const id = item.id
    setActiveNavItem(id)
    if (id === 'inicio') onNavigate('home')
    if (id === 'bandeja') onNavigate('bandeja')
  }

  const modulos = useMemo(() => {
    const distintos = new Set((data?.errores ?? []).map((item) => item.modulo))
    return Array.from(distintos).sort()
  }, [data])

  const empresaOptions: DropdownOption[] = [
    { value: 'todas', label: 'Empresa: Todas' },
    ...(data?.empresas ?? []).map((empresa) => ({
      value: empresa.id,
      label: `Empresa: ${empresa.nombre}`,
    })),
  ]

  const moduloOptions: DropdownOption[] = [
    { value: 'todos', label: 'Proceso: Todos' },
    ...modulos.map((modulo) => ({
      value: modulo,
      label: `Proceso: ${modulo}`,
    })),
  ]

  const estadoOptions: DropdownOption[] = [
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
          badges={
            data
              ? {
                  bandeja: {
                    text: String(data.bandejaPendientes),
                    color: colors.label.orange.text,
                    backgroundColor: colors.label.orange.background,
                  },
                }
              : undefined
          }
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
                  Bandeja de errores
                </h1>
                <p style={{ ...textStyles.body, color: colors.gray.medium }}>
                  {data ? data.totalAbiertos : '—'} transacciones con
                  inconvenientes en Softland
                </p>
              </div>
            </div>
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

          <div className="flex flex-wrap items-center gap-md">
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
              placeholder="Buscar por ID de transacción..."
              value={filters.busqueda}
              onChange={(event) => setFilters({ busqueda: event.target.value })}
              className="min-w-[240px] flex-1"
            />
            <Dropdown
              text="Empresa: Todas"
              options={empresaOptions}
              color={colors.background.border}
              textColor={colors.gray.dark}
              backgroundColor={colors.background.surface}
              value={filters.empresaId}
              onChange={(value) => setFilters({ empresaId: value })}
            />
            <Dropdown
              text="Proceso: Todos"
              options={moduloOptions}
              color={colors.background.border}
              textColor={colors.gray.dark}
              backgroundColor={colors.background.surface}
              value={filters.modulo}
              onChange={(value) => setFilters({ modulo: value })}
            />
            <Dropdown
              text="Estado: Todos"
              options={estadoOptions}
              color={colors.background.border}
              textColor={colors.gray.dark}
              backgroundColor={colors.background.surface}
              value={filters.estado}
              onChange={(value) => setFilters({ estado: value })}
            />
            <Dropdown
              text="Responsable: Todos"
              options={responsableOptions}
              color={colors.background.border}
              textColor={colors.gray.dark}
              backgroundColor={colors.background.surface}
              value={filters.responsableId}
              onChange={(value) => setFilters({ responsableId: value })}
            />
            <Dropdown
              text="Fecha: Todo el historial"
              options={periodoOptions}
              color={colors.background.border}
              textColor={colors.gray.dark}
              backgroundColor={colors.background.surface}
              value={filters.periodo}
              onChange={(value) => setFilters({ periodo: value })}
            />
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
              className="w-full rounded-xl shadow-md"
            >
              <BandejaTableHeader />
              {erroresFiltrados.length === 0 ? (
                <div
                  style={{ ...textStyles.body, color: colors.gray.medium }}
                  className="px-lg py-xxl text-center"
                >
                  No hay transacciones que coincidan con los filtros.
                </div>
              ) : (
                <div>
                  {erroresFiltrados.map((item) => (
                    <BandejaRow
                      key={item.id}
                      error={item}
                      empresas={data.empresas}
                      usuarios={data.usuarios}
                      onOpen={() => onNavigate('detalle')}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default BandejaErrores
