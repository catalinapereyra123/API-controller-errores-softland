import iflowGlobo from '../assets/iflow-globo.png'
import { useAuth } from '../auth/useAuth'
import { useResumenBandeja } from '../hooks/useResumenBandeja'
import { colors } from '../styles'
import { ArrowUpRightIcon } from './icons'
import Sidebar, { type SidebarItemId, type SidebarNavItem } from './Sidebar'

interface AppSidebarProps {
  activeItem: SidebarItemId
  onItemSelect: (item: SidebarNavItem) => void
  /** Lleva a la bandeja desde la tarjeta de pendientes. */
  onIrABandeja: () => void
  collapsed?: boolean
}

/**
 * `Sidebar` ya cableado con los colores de la app, el usuario de la sesión,
 * los contadores de la bandeja y el cierre de sesión. Las pantallas sólo dicen
 * qué ítem está activo.
 */
function AppSidebar({
  activeItem,
  onItemSelect,
  onIrABandeja,
  collapsed,
}: AppSidebarProps) {
  const { usuario, salir } = useAuth()
  const stats = useResumenBandeja()

  return (
    <Sidebar
      logoText={
        <img src={iflowGlobo} alt="" className="h-full w-full object-contain" />
      }
      logoColor={colors.gray.white}
      logoBackground="transparent"
      title="IRIS"
      subtitle="Incidencias de Softland"
      titleColor={colors.gray.darkest}
      subtitleColor={colors.gray.medium}
      backgroundColor={colors.background.surface}
      dividerColor={colors.background.border}
      sectionTitleColor={colors.gray.default}
      itemColor={colors.gray.medium}
      itemHoverBackground={colors.background.subtle}
      itemActiveColor={colors.gray.white}
      itemActiveBackground={colors.primary.default}
      activeItem={activeItem}
      onItemSelect={onItemSelect}
      badges={stats ? { bandeja: stats.sinResponsable } : undefined}
      destacado={
        stats && (
          <TarjetaPendientes
            sinResponsable={stats.sinResponsable}
            abiertos={stats.erroresAbiertos}
            onIr={onIrABandeja}
          />
        )
      }
      onLogout={salir}
      collapsed={collapsed}
      user={
        usuario
          ? {
              name: usuario.nombre,
              role: usuario.rol,
              avatarText: usuario.avatarIniciales,
              avatarColor: colors.primary.dark,
              avatarBackground: colors.primary.lightest,
            }
          : undefined
      }
    />
  )
}

/** Tarjeta verde oscura del pie del sidebar: lo que espera en la bandeja. */
function TarjetaPendientes({
  sinResponsable,
  abiertos,
  onIr,
}: {
  sinResponsable: number
  abiertos: number
  onIr: () => void
}) {
  return (
    <button
      type="button"
      onClick={onIr}
      className="group relative flex w-full cursor-pointer flex-col gap-md overflow-hidden rounded-xxl bg-[linear-gradient(160deg,#14532d,#0b2e18)] p-md text-left text-white transition-transform duration-200 hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-primary-default/50 focus-visible:outline-none"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -top-10 -right-8 h-28 w-28 rounded-full border-[18px] border-white/[0.06]"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -bottom-12 -left-6 h-28 w-28 rounded-full bg-brand-lime/25 blur-2xl"
      />
      <span className="relative flex flex-col gap-xxs">
        <span className="text-cifra-sm font-medium tabular-nums">
          {sinResponsable}
        </span>
        <span className="text-bodySmall font-semibold text-white/85">
          {sinResponsable === 1
            ? 'error sin responsable'
            : 'errores sin responsable'}
        </span>
        <span className="text-caption text-white/60">
          de {abiertos} abiertos en la bandeja
        </span>
      </span>
      <span className="relative inline-flex items-center justify-between gap-sm rounded-full bg-brand-lime py-xs pr-xs pl-md text-bodySmall font-semibold text-brand-deep">
        Ir a la bandeja
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-deep text-brand-lime transition-transform duration-200 group-hover:rotate-45">
          <ArrowUpRightIcon className="h-3.5 w-3.5" />
        </span>
      </span>
    </button>
  )
}

export default AppSidebar
