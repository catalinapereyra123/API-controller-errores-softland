import type { AnchorHTMLAttributes, CSSProperties, ReactNode } from 'react'
import { cn } from '../utils/cn'

export interface SidebarBadge {
  text: string
  color: string
  backgroundColor: string
}

export interface SidebarNavItem {
  id?: string
  icon: ReactNode
  label: string
  badge?: SidebarBadge
  href?: AnchorHTMLAttributes<HTMLAnchorElement>['href']
  onClick?: () => void
}

export interface SidebarSection {
  title: string
  items: SidebarNavItem[]
}

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
  sections: SidebarSection[]
  activeItem?: string
  onItemSelect?: (item: SidebarNavItem) => void
  user?: SidebarUser
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
  sections,
  activeItem,
  onItemSelect,
  user,
  className,
}: SidebarProps) {
  return (
    <aside
      style={{ backgroundColor }}
      className={cn('flex h-full w-full flex-col gap-xl p-lg', className)}
    >
      <div className="flex items-center gap-sm">
        <span
          style={{ color: logoColor, backgroundColor: logoBackground }}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-body font-bold"
        >
          {logoText}
        </span>
        <div className="flex min-w-0 flex-col">
          <span
            style={{ color: titleColor }}
            className="truncate text-body font-bold"
          >
            {title}
          </span>
          <span
            style={{ color: subtitleColor }}
            className="truncate text-bodySmall"
          >
            {subtitle}
          </span>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-lg overflow-y-auto">
        {sections.map((section) => (
          <div key={section.title} className="flex flex-col gap-xs">
            <span
              style={{ color: sectionTitleColor }}
              className="px-sm text-caption font-bold tracking-wide uppercase"
            >
              {section.title}
            </span>

            <ul className="flex flex-col gap-xxs">
              {section.items.map((item) => {
                const itemId = item.id ?? item.label
                const isActive = itemId === activeItem

                return (
                  <li key={itemId}>
                    <a
                      href={item.href ?? '#'}
                      onClick={(event) => {
                        if (!item.href) event.preventDefault()
                        item.onClick?.()
                        onItemSelect?.(item)
                      }}
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
                        'flex items-center gap-sm rounded-lg px-sm py-sm text-body font-semibold transition-colors',
                        !isActive && 'hover:bg-[var(--item-hover-bg)]',
                      )}
                    >
                      <span
                        aria-hidden
                        className="flex h-5 w-5 shrink-0 items-center justify-center"
                      >
                        {item.icon}
                      </span>
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.badge && (
                        <span
                          style={{
                            color: item.badge.color,
                            backgroundColor: item.badge.backgroundColor,
                          }}
                          className="rounded-full px-xs py-xxs text-caption font-bold"
                        >
                          {item.badge.text}
                        </span>
                      )}
                    </a>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {user && (
        <div
          style={{ borderColor: dividerColor }}
          className="flex items-center gap-sm border-t pt-lg"
        >
          <span
            style={{
              color: user.avatarColor,
              backgroundColor: user.avatarBackground,
            }}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-bodySmall font-bold"
          >
            {user.avatarText}
          </span>
          <div className="flex min-w-0 flex-col">
            <span
              style={{ color: titleColor }}
              className="truncate text-body font-bold"
            >
              {user.name}
            </span>
            <span
              style={{ color: subtitleColor }}
              className="truncate text-bodySmall"
            >
              {user.role}
            </span>
          </div>
        </div>
      )}
    </aside>
  )
}

export default Sidebar
