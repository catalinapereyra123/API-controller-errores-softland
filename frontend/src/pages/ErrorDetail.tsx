import { useRef, useState, type ReactNode } from 'react'
import Button from '../components/Button'
import Card from '../components/Card'
import Dropdown, { type DropdownOption } from '../components/Dropdown'
import ErrorActionsCard from '../components/ErrorActionsCard'
import EstadosSoftlandModal from '../components/EstadosSoftlandModal'
import InfoStrip from '../components/InfoStrip'
import {
  ArrowLeftIcon,
  ChevronDownIcon,
  ExternalLinkIcon,
  InfoIcon,
  PanelLeftIcon,
  SendIcon,
} from '../components/icons'
import AppSidebar from '../components/AppSidebar'
import type { SidebarNavItem } from '../components/Sidebar'
import Tabs, { type TabItem } from '../components/Tabs'
import Timeline from '../components/Timeline'
import { estadoLabels, estadoTagByEstado } from '../constants/estados'
import { ESTADOS_SOFTLAND } from '../constants/estadosSoftland'
import { trazabilidadToTimelineItems } from '../constants/trazabilidad'
import { useErrorDetail } from '../hooks/useErrorDetail'
import {
  colors,
  fontFamily,
  fontWeight,
  radius,
  spacing,
  textStyles,
} from '../styles'
import { ESTADOS_MANUALES, type AppPage, type ErrorEstado } from '../types'
import { cn } from '../utils/cn'
import {
  formatDate,
  formatDetectedAt,
  formatElapsedSince,
} from '../utils/format'

const TABS: TabItem[] = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'reprocesos', label: 'Reprocesos' },
  { id: 'trazabilidad', label: 'Trazabilidad' },
]

const SIN_ASIGNAR = 'sin-asignar'

function Avatar({ text }: { text: string }) {
  return (
    <span
      style={{
        color: colors.primary.dark,
        backgroundColor: colors.primary.lightest,
      }}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-bodySmall font-bold"
    >
      {text}
    </span>
  )
}

function Field({
  label,
  value,
  mono,
}: {
  label: string
  value: ReactNode
  mono?: boolean
}) {
  return (
    <div className="flex min-w-0 flex-col gap-xxs">
      <span style={{ ...textStyles.caption, color: colors.gray.medium }}>
        {label}
      </span>
      <span
        style={{
          ...textStyles.body,
          fontWeight: fontWeight.bold,
          color: colors.gray.darkest,
          ...(mono ? { fontFamily: fontFamily.mono.join(', ') } : {}),
        }}
        className="break-words"
      >
        {value}
      </span>
    </div>
  )
}

/** Círculo con el status crudo de Softland (E, X, N, S…) y su descripción. */
function StatusSoftland({ status }: { status: string }) {
  const meta = ESTADOS_SOFTLAND.find((estado) => estado.code === status)

  return (
    <span className="inline-flex items-center gap-xs">
      <span
        style={{
          backgroundColor: meta?.background ?? colors.label.gray.background,
          color: meta?.color ?? colors.label.gray.text,
        }}
        className="inline-flex h-6 w-6 items-center justify-center rounded-full text-caption font-bold"
      >
        {status}
      </span>
      <span style={{ ...textStyles.bodySmall, color: colors.gray.medium }}>
        {meta?.label ?? 'Sin descripción'}
      </span>
    </span>
  )
}

function CollapsibleCard({
  title,
  defaultOpen = true,
  children,
}: {
  title: string
  defaultOpen?: boolean
  children: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <Card>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between"
      >
        <span style={{ ...textStyles.h3, color: colors.gray.darkest }}>
          {title}
        </span>
        <ChevronDownIcon
          className={cn('h-5 w-5 transition-transform', open && 'rotate-180')}
          style={{ color: colors.gray.default }}
        />
      </button>
      {open && <div className="mt-lg">{children}</div>}
    </Card>
  )
}

function ErrorDetail({
  errorId,
  onNavigate,
}: {
  errorId: string | null
  onNavigate: (page: AppPage) => void
}) {
  const {
    data,
    loading,
    error,
    refetch,
    saving,
    actionError,
    asignar,
    cambiarEstadoManual,
    observar,
    reprocesar,
  } = useErrorDetail(errorId)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [tab, setTab] = useState('resumen')
  const [comentario, setComentario] = useState('')
  const [estadosOpen, setEstadosOpen] = useState(false)
  const tabsRef = useRef<HTMLDivElement>(null)

  function irATrazabilidad() {
    setTab('trazabilidad')
    tabsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function handleSelectNavItem(item: SidebarNavItem) {
    if (item.id === 'inicio') onNavigate('home')
    if (item.id === 'bandeja') onNavigate('bandeja')
    if (item.id === 'historial') onNavigate('historial')
  }

  async function handleComentar() {
    const texto = comentario.trim()
    if (!texto) return
    await observar(texto)
    setComentario('')
  }

  const detalle = data?.detalle
  const EstadoTag = detalle ? estadoTagByEstado[detalle.estado] : null
  const responsable = data?.usuarios.find(
    (usuario) => usuario.id === detalle?.responsableId,
  )

  const responsableOptions: DropdownOption[] = [
    { value: SIN_ASIGNAR, label: 'Sin asignar' },
    ...(data?.usuarios ?? []).map((usuario) => ({
      value: usuario.id,
      label: usuario.nombre,
    })),
  ]

  const estadoOptions: DropdownOption[] = ESTADOS_MANUALES.map((estado) => ({
    value: estado,
    label: estadoLabels[estado],
  }))

  // REPROCESANDO / REQUIERE_CORRECCION / RESUELTO los maneja el flujo de
  // reproceso: el back rechaza setearlos a mano.
  const estadoEsManual = detalle
    ? ESTADOS_MANUALES.includes(detalle.estado)
    : false

  return (
    <div
      style={{ backgroundColor: colors.background.page }}
      className="flex h-screen w-full"
    >
      <div
        style={{ borderColor: colors.background.border }}
        className={cn(
          'shrink-0 overflow-hidden border-r transition-[width] duration-200 ease-in-out',
          sidebarOpen ? 'w-[280px]' : 'w-0 border-r-0',
        )}
      >
        <AppSidebar activeItem="bandeja" onItemSelect={handleSelectNavItem} />
      </div>

      <main className="flex-1 overflow-y-auto p-xl">
        <div className="mx-auto flex max-w-[1120px] flex-col gap-lg">
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
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md shadow-md transition-colors hover:bg-background-page"
            >
              <PanelLeftIcon className="h-5 w-5" />
            </button>

            <Button
              text="Volver a la bandeja de errores"
              color={colors.gray.medium}
              variant="text"
              onClick={() => onNavigate('bandeja')}
              icon={<ArrowLeftIcon className="h-4 w-4" />}
              size={{
                ...textStyles.bodySmall,
                fontWeight: fontWeight.bold,
                padding: `${spacing.xs} 0`,
              }}
            />
          </div>

          {(error ?? actionError) && (
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
              {error ?? actionError}
              <button type="button" className="underline" onClick={refetch}>
                Reintentar
              </button>
            </div>
          )}

          {loading || !detalle || !EstadoTag ? (
            <Card className="flex items-center justify-center py-xxl">
              <span style={{ ...textStyles.body, color: colors.gray.medium }}>
                {error ? 'No hay detalle para mostrar.' : 'Cargando detalle…'}
              </span>
            </Card>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-md">
                <h1
                  style={{
                    ...textStyles.display,
                    fontFamily: fontFamily.mono.join(', '),
                    color: colors.gray.darkest,
                  }}
                >
                  {detalle.codigo}
                </h1>
                <EstadoTag />
              </div>

              <InfoStrip
                items={[
                  { label: 'Empresa', value: detalle.empresaNombre },
                  { label: 'Proceso', value: detalle.modulo },
                  { label: 'Cuenta', value: detalle.cuenta?.trim() || '—' },
                  {
                    label: 'Detectado',
                    value: formatDetectedAt(detalle.abiertoDesde),
                  },
                  {
                    label: 'Tiempo abierto',
                    value:
                      detalle.estado === 'RESUELTO'
                        ? '—'
                        : formatElapsedSince(detalle.abiertoDesde),
                  },
                  { label: 'Intentos', value: detalle.intentos },
                ]}
              />

              <div ref={tabsRef} className="scroll-mt-xl">
                <Tabs
                  items={TABS}
                  value={tab}
                  onChange={setTab}
                  activeColor={colors.primary.dark}
                  inactiveColor={colors.gray.medium}
                  dividerColor={colors.background.border}
                />
              </div>

              {tab === 'trazabilidad' && (
                <Card>
                  <span
                    style={{ ...textStyles.h3, color: colors.gray.darkest }}
                    className="mb-lg block"
                  >
                    Trazabilidad completa
                  </span>
                  {detalle.trazabilidad.length === 0 ? (
                    <span
                      style={{
                        ...textStyles.bodySmall,
                        color: colors.gray.medium,
                      }}
                    >
                      Todavía no hay eventos registrados.
                    </span>
                  ) : (
                    <Timeline
                      items={trazabilidadToTimelineItems(detalle.trazabilidad)}
                      connectorColor={colors.background.border}
                      timeColor={colors.gray.default}
                      titleColor={colors.gray.darkest}
                      descriptionColor={colors.gray.medium}
                    />
                  )}
                </Card>
              )}

              {tab === 'reprocesos' && (
                <Card>
                  <span
                    style={{ ...textStyles.h3, color: colors.gray.darkest }}
                    className="mb-lg block"
                  >
                    Intentos de reproceso
                  </span>

                  {detalle.intentosReproceso.length === 0 ? (
                    <span
                      style={{
                        ...textStyles.bodySmall,
                        color: colors.gray.medium,
                      }}
                    >
                      Esta transacción nunca se mandó a reprocesar.
                    </span>
                  ) : (
                    <div className="flex flex-col gap-md">
                      {detalle.intentosReproceso.map((intento) => (
                        <div
                          key={intento.id}
                          style={{ borderColor: colors.background.border }}
                          className="flex flex-wrap items-start gap-lg border-b pb-md last:border-b-0 last:pb-0"
                        >
                          <Field
                            label="Intento"
                            value={`#${intento.numeroIntento}`}
                          />
                          <Field
                            label="Solicitado"
                            value={formatDetectedAt(intento.fecha)}
                          />
                          <Field
                            label="Por"
                            value={intento.usuario ?? 'Sistema'}
                          />
                          <Field
                            label="Status antes"
                            value={intento.statusAntes ?? '—'}
                            mono
                          />
                          <Field
                            label="Status después"
                            value={
                              intento.statusDespues ?? 'Esperando resultado'
                            }
                            mono
                          />
                          {intento.observacion && (
                            <Field
                              label="Observación"
                              value={intento.observacion}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              )}

              {tab === 'resumen' && (
                <div className="grid gap-lg lg:grid-cols-[minmax(0,1fr)_320px]">
                  {/* Columna principal */}
                  <div className="flex flex-col gap-lg">
                    <Card
                      backgroundColor={colors.label.red.background}
                      shadow={false}
                      radiusSize="lg"
                    >
                      <div className="flex gap-sm">
                        <span
                          style={{ color: colors.label.red.text }}
                          className="mt-xxs flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-caption font-bold"
                        >
                          !
                        </span>
                        <div className="flex flex-col gap-xs">
                          <span
                            style={{
                              ...textStyles.overline,
                              fontWeight: fontWeight.semibold,
                              color: colors.label.red.text,
                            }}
                            className="uppercase"
                          >
                            Mensaje de Softland
                          </span>
                          <p
                            style={{
                              ...textStyles.bodyLarge,
                              fontWeight: fontWeight.bold,
                              color: colors.gray.darkest,
                            }}
                          >
                            “{detalle.descripcion}”
                          </p>
                        </div>
                      </div>
                    </Card>

                    <Card>
                      <div className="flex items-center justify-between gap-md">
                        <span
                          style={{
                            ...textStyles.h3,
                            color: colors.gray.darkest,
                          }}
                        >
                          Datos de la transacción
                        </span>
                        <span
                          style={{
                            ...textStyles.caption,
                            fontFamily: fontFamily.mono.join(', '),
                            fontWeight: fontWeight.semibold,
                            color: colors.gray.default,
                          }}
                        >
                          {detalle.empresaId} · {detalle.moduloCodigo}
                        </span>
                      </div>

                      <div className="mt-lg grid grid-cols-2 gap-lg sm:grid-cols-3">
                        <Field label="IDENTI" value={detalle.codigo} mono />
                        <Field
                          label="Cuenta"
                          value={detalle.cuenta?.trim() || '—'}
                          mono
                        />
                        <Field
                          label="Fecha del movimiento"
                          value={formatDate(detalle.fechaMovimiento)}
                        />
                        <Field
                          label="Status en Softland"
                          value={
                            <StatusSoftland status={detalle.statusSoftland} />
                          }
                        />
                        <Field
                          label="Última sincronización"
                          value={formatDetectedAt(detalle.ultimaDeteccion)}
                        />
                        <Field
                          label="¿Sigue en el feed?"
                          value={detalle.presenteEnUltimaSync ? 'Sí' : 'No'}
                        />
                        {detalle.corregidoPor && (
                          <Field
                            label="Corregido por"
                            value={detalle.corregidoPor}
                          />
                        )}
                        {detalle.fechaCorreccion && (
                          <Field
                            label="Mandado a reprocesar"
                            value={formatDetectedAt(detalle.fechaCorreccion)}
                          />
                        )}
                        {detalle.fechaResolucion && (
                          <Field
                            label="Resuelto"
                            value={formatDetectedAt(detalle.fechaResolucion)}
                          />
                        )}
                      </div>

                      {detalle.archivoLog && (
                        <div
                          style={{
                            borderColor: colors.background.border,
                            borderRadius: radius.lg,
                          }}
                          className="mt-lg border p-md"
                        >
                          <Field
                            label="Archivo de log en el servidor"
                            value={detalle.archivoLog}
                            mono
                          />
                        </div>
                      )}
                    </Card>

                    <CollapsibleCard title="Observaciones">
                      <div className="flex flex-col gap-lg">
                        {detalle.observaciones.length === 0 && (
                          <span
                            style={{
                              ...textStyles.bodySmall,
                              color: colors.gray.medium,
                            }}
                          >
                            Todavía no hay observaciones.
                          </span>
                        )}

                        {detalle.observaciones.map((obs) => (
                          <div
                            key={obs.id}
                            style={{ borderColor: colors.background.border }}
                            className="flex flex-col gap-sm border-b pb-lg last:border-b-0 last:pb-0"
                          >
                            <div className="flex items-center gap-sm">
                              <Avatar text={obs.iniciales} />
                              <span
                                style={{
                                  ...textStyles.body,
                                  fontWeight: fontWeight.bold,
                                  color: colors.gray.darkest,
                                }}
                              >
                                {obs.autor}
                              </span>
                              <span
                                style={{
                                  ...textStyles.caption,
                                  color: colors.gray.default,
                                }}
                              >
                                {formatDetectedAt(obs.hace)}
                              </span>
                            </div>
                            <p
                              style={{
                                ...textStyles.bodySmall,
                                color: colors.gray.dark,
                              }}
                              className="pl-[calc(2.25rem+0.5rem)]"
                            >
                              {obs.texto}
                            </p>
                          </div>
                        ))}

                        <div className="flex flex-col gap-sm">
                          <div className="flex flex-col gap-xxs">
                            <span
                              style={{
                                ...textStyles.body,
                                fontWeight: fontWeight.bold,
                                color: colors.gray.darkest,
                              }}
                            >
                              Agregar una observación
                            </span>
                            <span
                              style={{
                                ...textStyles.caption,
                                color: colors.gray.medium,
                              }}
                            >
                              Deja un comentario para el equipo sobre este
                              error.
                            </span>
                          </div>
                          <textarea
                            value={comentario}
                            onChange={(event) =>
                              setComentario(event.target.value)
                            }
                            rows={4}
                            placeholder="Escribe tu comentario aquí..."
                            style={{
                              ...textStyles.bodySmall,
                              color: colors.gray.darkest,
                              borderColor: colors.background.border,
                              borderRadius: radius.lg,
                            }}
                            className="w-full resize-none border p-md outline-none focus:border-primary-default"
                          />
                          <div className="flex justify-end">
                            <Button
                              text={saving ? 'Guardando…' : 'Comentar'}
                              color={colors.primary.default}
                              disabled={
                                comentario.trim().length === 0 || saving
                              }
                              onClick={() => void handleComentar()}
                              icon={<SendIcon className="h-4 w-4" />}
                              size={{
                                ...textStyles.bodySmall,
                                fontWeight: fontWeight.bold,
                                padding: `${spacing.sm} ${spacing.lg}`,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </CollapsibleCard>
                  </div>

                  {/* Columna lateral */}
                  <div className="flex flex-col gap-lg">
                    <Button
                      text="Ver posibles estados"
                      color={colors.gray.default}
                      variant="outline"
                      icon={<InfoIcon className="h-4 w-4" />}
                      onClick={() => setEstadosOpen(true)}
                      size={{
                        ...textStyles.bodySmall,
                        fontWeight: fontWeight.semibold,
                        padding: `${spacing.xs} ${spacing.md}`,
                      }}
                      className="self-start"
                    />

                    <Card>
                      <span
                        style={{
                          ...textStyles.h3,
                          color: colors.gray.darkest,
                        }}
                      >
                        Responsable
                      </span>

                      {responsable ? (
                        <div className="mt-md flex items-center gap-sm">
                          <Avatar text={responsable.avatarIniciales} />
                          <div className="flex min-w-0 flex-1 flex-col">
                            <span
                              style={{
                                ...textStyles.body,
                                fontWeight: fontWeight.bold,
                                color: colors.gray.darkest,
                              }}
                            >
                              {responsable.nombre}
                            </span>
                            <span
                              style={{
                                ...textStyles.caption,
                                color: colors.gray.medium,
                              }}
                            >
                              {responsable.rol}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <p
                          style={{
                            ...textStyles.bodySmall,
                            color: colors.status.error,
                          }}
                          className="mt-md"
                        >
                          Sin responsable asignado
                        </p>
                      )}

                      <Dropdown
                        text="Asignar a…"
                        options={responsableOptions}
                        color={colors.background.border}
                        textColor={colors.gray.dark}
                        backgroundColor={colors.background.surface}
                        value={detalle.responsableId ?? SIN_ASIGNAR}
                        onChange={(value) =>
                          void asignar(value === SIN_ASIGNAR ? null : value)
                        }
                        className="mt-md"
                      />
                      {data?.usuarios.length === 0 && (
                        <p
                          style={{
                            ...textStyles.caption,
                            color: colors.gray.medium,
                          }}
                          className="mt-xs"
                        >
                          Todavía no hay usuarios cargados.
                        </p>
                      )}
                    </Card>

                    <Card>
                      <span
                        style={{ ...textStyles.h3, color: colors.gray.darkest }}
                      >
                        Estado de gestión
                      </span>
                      <Dropdown
                        text={estadoLabels[detalle.estado]}
                        options={estadoOptions}
                        color={colors.background.border}
                        textColor={colors.gray.dark}
                        backgroundColor={colors.background.surface}
                        value={estadoEsManual ? detalle.estado : undefined}
                        onChange={(value) =>
                          void cambiarEstadoManual(value as ErrorEstado)
                        }
                        className="mt-md"
                      />
                      {!estadoEsManual && (
                        <p
                          style={{
                            ...textStyles.caption,
                            color: colors.gray.medium,
                          }}
                          className="mt-xs"
                        >
                          Está en “{estadoLabels[detalle.estado]}”: ese estado
                          lo maneja el flujo de reproceso.
                        </p>
                      )}
                    </Card>

                    <ErrorActionsCard
                      onMarkAsFixed={() => void reprocesar()}
                      disabled={
                        saving ||
                        detalle.estado === 'REPROCESANDO' ||
                        detalle.estado === 'RESUELTO'
                      }
                    />

                    <CollapsibleCard title="Trazabilidad">
                      {detalle.trazabilidad.length === 0 ? (
                        <span
                          style={{
                            ...textStyles.bodySmall,
                            color: colors.gray.medium,
                          }}
                        >
                          Sin eventos.
                        </span>
                      ) : (
                        <Timeline
                          items={trazabilidadToTimelineItems(
                            detalle.trazabilidad.slice(-3),
                          )}
                          connectorColor={colors.background.border}
                          timeColor={colors.gray.default}
                          titleColor={colors.gray.darkest}
                          descriptionColor={colors.gray.medium}
                          footer={
                            <div className="flex justify-end">
                              <Button
                                text="Ver historial completo"
                                color={colors.primary.dark}
                                variant="text"
                                onClick={irATrazabilidad}
                                trailingIcon={
                                  <ExternalLinkIcon className="h-4 w-4" />
                                }
                                size={{
                                  ...textStyles.bodySmall,
                                  fontWeight: fontWeight.bold,
                                  padding: `${spacing.xs} 0`,
                                }}
                              />
                            </div>
                          }
                        />
                      )}
                    </CollapsibleCard>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <EstadosSoftlandModal
        open={estadosOpen}
        onClose={() => setEstadosOpen(false)}
      />
    </div>
  )
}

export default ErrorDetail
