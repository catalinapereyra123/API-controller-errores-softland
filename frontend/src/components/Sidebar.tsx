import type { CSSProperties, ReactNode } from 'react'
import { HistoryIcon, HomeIcon, InboxIcon, LogoutIcon } from './icons'
import { cn } from '../utils/cn'

export type SidebarItemId = 'inicio' | 'bandeja' | 'historial'

export interface SidebarNavItem {
  id: SidebarItemId
  icon: ReactNode
  label: string
}

// Navegación fija de la app. Vive acá para no repetirla en cada page.
const SIDEBAR_ITEMS: SidebarNavItem[] = [
  { id: 'inicio', icon: <HomeIcon className="h-5 w-5" />, label: 'Inicio' },
  {
    id: 'bandeja',
    icon: <InboxIcon className="h-5 w-5" />,
    label: 'Bandeja de errores',
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
  logoText: string
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
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-bodyLarge font-extrabold shadow-sm"
        >
          {logoText}
        </span>
        {!collapsed && (
          <div className="flex min-w-0 flex-col">
            <span
              style={{ color: titleColor }}
              className="truncate text-body font-bold whitespace-nowrap"
            >
              {title}
            </span>
            <span
              style={{ color: subtitleColor }}
              className="truncate text-bodySmall whitespace-nowrap"
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
        <div className="flex flex-col gap-xs">
          {collapsed ? (
            <span
              aria-hidden
              style={{ backgroundColor: dividerColor }}
              className="mx-auto mb-xs h-px w-6"
            />
          ) : (
            <span
              style={{ color: sectionTitleColor }}
              className="px-sm text-overline font-bold tracking-widest whitespace-nowrap uppercase"
            >
              Principal
            </span>
          )}

          <ul className="flex flex-col gap-xxs">
            {SIDEBAR_ITEMS.map((item) => {
              const isActive = item.id === activeItem

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
                        '--item-active-color': itemActiveColor,
                      } as CSSProperties
                    }
                    className={cn(
                      'group relative flex items-center gap-sm rounded-xl py-sm text-body font-semibold whitespace-nowrap transition-colors duration-150',
                      'focus-visible:ring-2 focus-visible:ring-primary-default/50 focus-visible:outline-none',
                      collapsed ? 'justify-center px-sm' : 'px-sm',
                      !isActive && 'hover:bg-[var(--item-hover-bg)]',
                    )}
                  >
                    {/* Barrita a la izquierda del ítem activo. */}
                    <span
                      aria-hidden
                      style={{ backgroundColor: 'var(--item-active-color)' }}
                      className={cn(
                        'absolute top-1/2 -left-sm h-5 w-1 -translate-y-1/2 rounded-r-full transition-opacity',
                        isActive ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                    <span
                      aria-hidden
                      className="flex h-5 w-5 shrink-0 items-center justify-center transition-transform duration-150 group-hover:scale-110"
                    >
                      {item.icon}
                    </span>
                    {!collapsed && (
                      <span className="flex-1 truncate">{item.label}</span>
                    )}
                  </a>
                </li>
              )
            })}
          </ul>
        </div>
      </nav>

      {user && (
        <div
          style={{ borderColor: dividerColor }}
          className={cn(
            'flex w-full gap-sm border-t pt-lg',
            collapsed ? 'flex-col items-center' : 'items-center px-xs',
          )}
        >
          <span
            title={collapsed ? `${user.name} · ${user.role}` : undefined}
            style={{
              color: user.avatarColor,
              backgroundColor: user.avatarBackground,
            }}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-bodySmall font-bold ring-2 ring-white"
          >
            {user.avatarText}
          </span>
          {!collapsed && (
            <div className="flex min-w-0 flex-1 flex-col">
              <span
                style={{ color: titleColor }}
                className="truncate text-body font-bold whitespace-nowrap"
              >
                {user.name}
              </span>
              <span
                style={{ color: subtitleColor }}
                className="truncate text-bodySmall whitespace-nowrap"
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
              className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-[var(--logout-color)] transition-colors hover:bg-label-red-background hover:text-label-red-text"
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
