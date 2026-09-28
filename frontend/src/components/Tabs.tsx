import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '../utils/cn'

export interface TabItem {
  id: string
  label: string
  /** Dato chico al lado del label, p. ej. un contador. */
  badge?: ReactNode
}

interface TabsProps {
  items: TabItem[]
  value: string
  onChange: (id: string) => void
  activeColor: string
  inactiveColor: string
  /** Borde del riel (pill) o línea de base (underline). */
  dividerColor?: string
  /** `pill`: control segmentado. `underline`: pestañas con subrayado. */
  variant?: 'pill' | 'underline'
  className?: string
}

/** Pestañas con un indicador que se desliza hasta la activa. */
function Tabs({
  items,
  value,
  onChange,
  activeColor,
  inactiveColor,
  dividerColor,
  variant = 'pill',
  className,
}: TabsProps) {
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([])
  const [indicator, setIndicator] = useState({ left: 0, width: 0 })
  const isPill = variant === 'pill'

  useLayoutEffect(() => {
    const activeIndex = items.findIndex((item) => item.id === value)
    const activeTab = tabRefs.current[activeIndex]
    if (activeTab) {
      setIndicator({ left: activeTab.offsetLeft, width: activeTab.offsetWidth })
    }
  }, [value, items])

  return (
    <div
      role="tablist"
      style={{ borderColor: dividerColor }}
      className={cn(
        'relative',
        isPill
          ? 'inline-flex gap-xxs rounded-xl bg-slate-200/60 p-xs'
          : 'flex gap-lg overflow-x-auto',
        dividerColor && (isPill ? 'border' : 'border-b'),
        className,
      )}
    >
      <span
        aria-hidden
        style={{
          left: indicator.left,
          width: indicator.width,
          backgroundColor: isPill ? undefined : activeColor,
        }}
        className={cn(
          'absolute transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
          isPill
            ? 'top-xs bottom-xs rounded-lg bg-background-surface shadow-soft ring-1 ring-slate-900/5'
            : 'bottom-0 h-[3px] rounded-t-full',
        )}
      />

      {items.map((item, index) => {
        const isActive = item.id === value

        return (
          <button
            key={item.id}
            ref={(el) => {
              tabRefs.current[index] = el
            }}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(item.id)}
            style={{ color: isActive ? activeColor : inactiveColor }}
            className={cn(
              'relative z-10 inline-flex shrink-0 cursor-pointer items-center gap-xs text-body font-bold whitespace-nowrap transition-colors hover:opacity-80 focus-visible:ring-2 focus-visible:ring-primary-default/50 focus-visible:outline-none',
              isPill ? 'rounded-lg px-md py-xs' : 'px-xxs pt-xs pb-md',
            )}
          >
            {item.label}
            {item.badge != null && (
              <span
                className={cn(
                  'rounded-full px-sm py-px text-caption font-bold tabular-nums',
                  isActive
                    ? 'bg-primary-lightest text-primary-dark'
                    : 'bg-background-subtle text-gray-medium',
                )}
              >
                {item.badge}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

export default Tabs
