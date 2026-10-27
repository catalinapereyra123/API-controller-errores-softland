import type { CSSProperties, ReactNode } from 'react'
import {
  BarChartIcon,
  GridIcon,
  HistoryIcon,
  InboxIcon,
  LogoutIcon,
} from './icons'
import { cn } from '../utils/cn'

export type SidebarItemId = 'inicio' | 'bandeja' | 'metricas' | 'historial'

export interface SidebarNavItem {
  id: SidebarItemId
  icon: ReactNode
  label: string
}

// Navegación fija de la app. Vive acá para no repetirla en cada page.
const SIDEBAR_ITEMS: SidebarNavItem[] = [
  { id: 'inicio', icon: <GridIcon className="h-5 w-5" />, label: 'Inicio' },
  {
    id: 'bandeja',
    icon: <InboxIcon className="h-5 w-5" />,
    label: 'Bandeja de errores',
  },
  {
    id: 'metricas',
    icon: <BarChartIcon className="h-5 w-5" />,
    label: 'Métricas',
  },
  {
    id: 'historial',
    icon: <HistoryIcon className="h-5 w-5" />,
    label: 'Historial',
  },
]

export interface SidebarUser {
  name: string
  role: string
  avatarText: string
  avatarColor: string
  avatarBackground: string
}

interface SidebarProps {
  /** Lo que va dentro del cuadrado del logo (una letra o un ícono). */
  logoText: ReactNode
  logoColor: string
  /** Color o gradiente CSS del cuadrado del logo. */
  logoBackground: string
  title: string
  subtitle: string
  titleColor: string
  subtitleColor: string
  backgroundColor: string
  dividerColor: string
  sectionTitleColor: string
  itemColor: string
  itemHoverBackground: string
  itemActiveColor: string
  itemActiveBackground: string
  activeItem?: SidebarItemId
  onItemSelect?: (item: SidebarNavItem) => void
  /** Contador al lado de un ítem (p. ej. errores sin responsable). */
  badges?: Partial<Record<SidebarItemId, number>>
  /** Tarjeta destacada sobre el usuario; se oculta en modo riel. */
  destacado?: ReactNode
  user?: SidebarUser
  /** Si viene, se muestra el botón de cerrar sesión junto al usuario. */
  onLogout?: () => void
  /** Modo riel: sólo íconos, los textos quedan como tooltip. */
  collapsed?: boolean
  className?: string
}

function Sidebar({
  logoText,
  logoColor,
  logoBackground,
  title,
  subtitle,
  titleColor,
  subtitleColor,
  backgroundColor,
  dividerColor,
  sectionTitleColor,
  itemColor,
  itemHoverBackground,
  itemActiveColor,
  itemActiveBackground,
  activeItem,
  onItemSelect,
  badges,
  destacado,
  user,
  onLogout,
  collapsed = false,
  className,
}: SidebarProps) {
  return (
    <aside
      style={{ backgroundColor }}
      className={cn(
        'flex h-full w-full flex-col gap-xl py-lg',
        collapsed ? 'items-center px-sm' : 'px-md',
        className,
      )}
    >
      <div
        className={cn(
          'flex items-center gap-sm',
          collapsed ? 'justify-center' : 'px-xs',
        )}
      >
        <span
          style={{ color: logoColor, background: logoBackground }}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-bodyLarge font-medium"
        >
          {logoText}
        </span>
        {!collapsed && (
          <div className="flex min-w-0 flex-col">
            <span
              style={{ color: titleColor }}
              className="truncate text-[1.375rem] leading-tight font-medium tracking-tight whitespace-nowrap"
            >
              {title}
            </span>
            <span
              style={{ color: subtitleColor }}
              className="truncate text-caption whitespace-nowrap"
            >
              {subtitle}
            </span>
          </div>
        )}
      </div>

      <nav
        aria-label="Principal"
        className="flex w-full flex-1 flex-col gap-lg overflow-y-auto"
      >
        <div className="flex flex-col gap-sm">
          {collapsed ? (
            <span
              aria-hidden
              style={{ backgroundColor: dividerColor }}
              className="mx-auto mb-xs h-px w-6"
            />
          ) : (
            <span
              style={{ color: sectionTitleColor }}
              className="px-sm text-overline font-semibold tracking-widest whitespace-nowrap uppercase"
            >
              Menú
            </span>
          )}

          <ul className="flex flex-col gap-xs">
            {SIDEBAR_ITEMS.map((item) => {
              const isActive = item.id === activeItem
              const badge = badges?.[item.id]

              return (
                <li key={item.id}>
                  <a
                    href="#"
                    onClick={(event) => {
                      event.preventDefault()
                      onItemSelect?.(item)
                    }}
                    aria-current={isActive ? 'page' : undefined}
                    aria-label={collapsed ? item.label : undefined}
                    title={collapsed ? item.label : undefined}
                    style={
                      {
                        color: isActive ? itemActiveColor : itemColor,
                        backgroundColor: isActive
                          ? itemActiveBackground
                          : 'transparent',
                        '--item-hover-bg': itemHoverBackground,
                      } as CSSProperties
                    }
                    className={cn(
                      'group relative flex h-11 items-center gap-sm rounded-full text-body font-semibold whitespace-nowrap transition-all duration-150',
                      'focus-visible:ring-2 focus-visible:ring-primary-default/50 focus-visible:outline-none',
                      collapsed ? 'w-11 justify-center' : 'px-md',
                      isActive
                        ? 'shadow-[0_8px_20px_-8px_rgba(22,163,74,0.7)]'
                        : 'hover:bg-[var(--item-hover-bg)]',
                    )}
                  >
                    <span
                      aria-hidden
                      className="flex h-5 w-5 shrink-0 items-center justify-center transition-transform duration-150 group-hover:scale-110"
                    >
                      {item.icon}
                    </span>
                    {!collapsed && (
                      <span className="flex-1 truncate">{item.label}</span>
                    )}
                    {badge != null && badge > 0 && (
                      <span
                        className={cn(
                          'flex h-5 min-w-5 items-center justify-center rounded-full px-xs text-[0.6875rem] font-semibold tabular-nums',
                          // En el riel va como globito sobre el ícono: rojo
                          // lleno para que se lea también sobre el verde.
                          collapsed
                            ? 'absolute -top-0.5 -right-1.5 bg-status-error text-white shadow-soft ring-2 ring-white'
                            : isActive
                              ? 'bg-white/25 text-white'
                              : 'bg-label-red-background text-label-red-text',
                        )}
                      >
                        {badge > 99 ? '99+' : badge}
                      </span>
                    )}
                  </a>
                </li>
              )
            })}
          </ul>
        </div>
      </nav>

      {!collapsed && destacado}

      {user && (
        <div
          className={cn(
            'flex w-full gap-sm',
            collapsed
              ? 'flex-col items-center'
              : 'items-center rounded-full bg-background-subtle p-xs pr-sm',
          )}
        >
          <span
            title={collapsed ? `${user.name} · ${user.role}` : undefined}
            style={{
              color: user.avatarColor,
              backgroundColor: user.avatarBackground,
            }}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-bodySmall font-semibold ring-2 ring-white"
          >
            {user.avatarText}
          </span>
          {!collapsed && (
            <div className="flex min-w-0 flex-1 flex-col">
              <span
                style={{ color: titleColor }}
                className="truncate text-bodySmall font-semibold whitespace-nowrap"
              >
                {user.name}
              </span>
              <span
                style={{ color: subtitleColor }}
                className="truncate text-caption whitespace-nowrap"
              >
                {user.role}
              </span>
            </div>
          )}

          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
              style={{ '--logout-color': subtitleColor } as CSSProperties}
              className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-[var(--logout-color)] transition-colors hover:bg-label-red-background hover:text-label-red-text"
            >
              <LogoutIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
    </aside>
  )
}

export default Sidebar
