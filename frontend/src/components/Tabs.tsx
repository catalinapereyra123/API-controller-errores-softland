import { useLayoutEffect, useRef, useState } from 'react'
import { cn } from '../utils/cn'

export interface TabItem {
  id: string
  label: string
}

interface TabsProps {
  items: TabItem[]
  value: string
  onChange: (id: string) => void
  activeColor: string
  inactiveColor: string
  dividerColor?: string
  className?: string
}

function Tabs({
  items,
  value,
  onChange,
  activeColor,
  inactiveColor,
  dividerColor,
  className,
}: TabsProps) {
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([])
  const [indicator, setIndicator] = useState({ left: 0, width: 0 })

  useLayoutEffect(() => {
    const activeIndex = items.findIndex((item) => item.id === value)
    const activeTab = tabRefs.current[activeIndex]
    if (activeTab) {
      setIndicator({ left: activeTab.offsetLeft, width: activeTab.offsetWidth })
    }
  }, [value, items])

  return (
    <div
      style={{ borderColor: dividerColor }}
      className={cn(
        'relative flex gap-lg',
        dividerColor && 'border-b',
        className,
      )}
    >
      {items.map((item, index) => {
        const isActive = item.id === value

        return (
          <button
            key={item.id}
            ref={(el) => {
              tabRefs.current[index] = el
            }}
            type="button"
            onClick={() => onChange(item.id)}
            style={{ color: isActive ? activeColor : inactiveColor }}
            className="px-xs pb-sm text-body font-bold transition-colors"
          >
            {item.label}
          </button>
        )
      })}

      <span
        style={{
          backgroundColor: activeColor,
          left: indicator.left,
          width: indicator.width,
        }}
        className="absolute bottom-0 h-xxs rounded-full transition-all duration-200 ease-in-out"
      />
    </div>
  )
}

export default Tabs
