import { useRef, useState, type ReactNode } from 'react'
import Button from '../components/Button'
import Card from '../components/Card'
import ErrorActionsCard from '../components/ErrorActionsCard'
import EstadosSoftlandModal from '../components/EstadosSoftlandModal'
import InfoStrip from '../components/InfoStrip'
import {
  ArrowLeftIcon,
  BellIcon,
  ChevronDownIcon,
  ExternalLinkIcon,
  InfoIcon,
  PanelLeftIcon,
  SendIcon,
} from '../components/icons'
import Sidebar, { type SidebarNavItem } from '../components/Sidebar'
import Tabs, { type TabItem } from '../components/Tabs'
import Timeline from '../components/Timeline'
import { estadoTagByEstado } from '../constants/estados'
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
import type { AppPage } from '../types'
import { cn } from '../utils/cn'
import { formatCurrency } from '../utils/format'

const TABS: TabItem[] = [
  { id: 'cabecera', label: 'Cabecera' },
  { id: 'items', label: 'Items' },
  { id: 'historial', label: 'Historial' },
]

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
  emphasis,
  valueColor,
}: {
  label: string
  value: ReactNode
  emphasis?: boolean
  valueColor?: string
}) {
  return (
    <div className="flex flex-col gap-xxs">
      <span style={{ ...textStyles.caption, color: colors.gray.medium }}>
        {label}
      </span>
      <span
        style={{
          ...(emphasis ? textStyles.h4 : textStyles.body),
          fontWeight: fontWeight.bold,
          color: valueColor ?? colors.gray.darkest,
        }}
      >
        {value}
      </span>
    </div>
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

function ErrorDetail({ onNavigate }: { onNavigate: (page: AppPage) => void }) {
  const { data, loading, error, refetch } = useErrorDetail()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [tab, setTab] = useState('cabecera')
  const [comentario, setComentario] = useState('')
  const [estadosOpen, setEstadosOpen] = useState(false)
  const tabsRef = useRef<HTMLDivElement>(null)

  function irAHistorial() {
    setTab('historial')
    tabsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function handleSelectNavItem(item: SidebarNavItem) {
    if (item.id === 'inicio') onNavigate('home')
    if (item.id === 'bandeja') onNavigate('bandeja')
  }

  const detalle = data?.detalle
  const EstadoTag = detalle ? estadoTagByEstado[detalle.estado] : null

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
          activeItem="bandeja"
          onItemSelect={handleSelectNavItem}
          badges={{
            bandeja: {
              text: '12',
              color: colors.label.orange.text,
              backgroundColor: colors.label.orange.background,
            },
          }}
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

          {loading || !detalle || !EstadoTag ? (
            <Card className="flex items-center justify-center py-xxl">
              <span style={{ ...textStyles.body, color: colors.gray.medium }}>
                Cargando detalle del error…
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
                  { label: 'Empresa', value: detalle.empresa },
                  { label: 'Proceso', value: detalle.proceso },
                  { label: 'Proveedor', value: detalle.proveedorCodigo },
                  { label: 'Detectado', value: detalle.detectadoEn },
                  { label: 'Tiempo abierto', value: detalle.tiempoAbierto },
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

              {tab !== 'cabecera' ? (
                <Card className="flex items-center justify-center py-xxl">
                  <span
                    style={{ ...textStyles.body, color: colors.gray.medium }}
                  >
                    {tab === 'items'
                      ? 'Sin ítems para mostrar en esta transacción.'
                      : 'El historial completo se mostrará acá.'}
                  </span>
                </Card>
              ) : (
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
                            “{detalle.mensajeSoftland}”
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
                          Cabecera de la transacción
                        </span>
                        <span
                          style={{
                            ...textStyles.caption,
                            fontFamily: fontFamily.mono.join(', '),
                            fontWeight: fontWeight.semibold,
                            color: colors.gray.default,
                          }}
                        >
                          {detalle.tablaSoftland}
                        </span>
                      </div>

                      <div className="mt-lg grid grid-cols-2 gap-lg sm:grid-cols-3">
                        <Field
                          label="Proveedor"
                          value={detalle.cabecera.proveedor}
                        />
                        <Field
                          label="Fecha de comprobante"
                          value={detalle.cabecera.fechaComprobante}
                        />
                        <Field
                          label="Estado actual"
                          value={
                            <span
                              style={{
                                backgroundColor: colors.label.gray.background,
                                color: colors.label.gray.text,
                              }}
                              className="inline-flex h-6 w-6 items-center justify-center rounded-full text-caption font-bold"
                            >
                              {detalle.cabecera.estadoActual}
                            </span>
                          }
                        />
                        <Field
                          label="Importe total"
                          value={formatCurrency(detalle.cabecera.importeTotal)}
                          emphasis
                        />
                        <Field
                          label="Importe aplicado"
                          value={formatCurrency(
                            detalle.cabecera.importeAplicado,
                          )}
                          emphasis
                        />
                        <Field
                          label="Diferencia"
                          value={formatCurrency(detalle.cabecera.diferencia)}
                          emphasis
                          valueColor={colors.status.error}
                        />
                      </div>
                    </Card>

                    <CollapsibleCard title="Observaciones">
                      <div className="flex flex-col gap-lg">
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
                                {obs.hace}
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
                              text="Comentar"
                              color={colors.primary.default}
                              disabled={comentario.trim().length === 0}
                              onClick={() => setComentario('')}
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

                      {detalle.responsable ? (
                        <div className="mt-md flex items-center gap-sm">
                          <Avatar text={detalle.responsable.iniciales} />
                          <div className="flex min-w-0 flex-1 flex-col">
                            <span
                              style={{
                                ...textStyles.body,
                                fontWeight: fontWeight.bold,
                                color: colors.gray.darkest,
                              }}
                            >
                              {detalle.responsable.nombre}
                            </span>
                            <span
                              style={{
                                ...textStyles.caption,
                                color: colors.gray.medium,
                              }}
                            >
                              {detalle.responsable.asignadaHace}
                            </span>
                          </div>
                          <Button
                            text="Cambiar"
                            color={colors.primary.dark}
                            variant="text"
                            size={{
                              ...textStyles.bodySmall,
                              fontWeight: fontWeight.bold,
                              padding: spacing.xs,
                            }}
                          />
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

                      <div className="mt-md flex items-center gap-xs">
                        <BellIcon
                          className="h-4 w-4"
                          style={{ color: colors.gray.default }}
                        />
                        <span
                          style={{
                            ...textStyles.bodySmall,
                            color: colors.gray.medium,
                          }}
                        >
                          Notificar por correo al asignar
                        </span>
                      </div>
                    </Card>

                    <ErrorActionsCard />

                    <CollapsibleCard title="Trazabilidad">
                      <Timeline
                        items={trazabilidadToTimelineItems(
                          detalle.trazabilidad,
                        )}
                        connectorColor={colors.background.border}
                        timeColor={colors.gray.default}
                        titleColor={colors.gray.darkest}
                        descriptionColor={colors.gray.medium}
                        footer={
                          <Button
                            text="Ver historial completo"
                            color={colors.primary.dark}
                            variant="text"
                            onClick={irAHistorial}
                            trailingIcon={
                              <ExternalLinkIcon className="h-4 w-4" />
                            }
                            size={{
                              ...textStyles.bodySmall,
                              fontWeight: fontWeight.bold,
                              padding: `${spacing.xs} 0`,
                            }}
                          />
                        }
                      />
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
