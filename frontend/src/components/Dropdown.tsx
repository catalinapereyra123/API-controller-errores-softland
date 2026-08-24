import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { cn } from '../utils/cn'

export interface DropdownOption {
  value: string
  label: string
  color?: string
}

interface DropdownProps {
  text: string
  options: DropdownOption[]
  color: string
  value?: string
  onChange?: (value: string) => void
  size?: CSSProperties
  className?: string
}

function Dropdown({
  text,
  options,
  color,
  value,
  onChange,
  size,
  className,
}: DropdownProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false)
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  const selected = options.find((option) => option.value === value)

  return (
    <div ref={containerRef} className={cn('relative inline-block', className)}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        style={{ borderColor: color, color, ...size }}
        className="inline-flex items-center gap-sm rounded-md border px-md py-sm text-body font-medium"
      >
        {selected?.label ?? text}
        <span
          aria-hidden
          className={cn('transition-transform', open && 'rotate-180')}
        >
          ▾
        </span>
      </button>

      {open && (
        <ul
          role="listbox"
          style={{ borderColor: color }}
          className="absolute z-10 mt-xs min-w-full rounded-md border bg-background-surface py-xs shadow-lg"
        >
          {options.map((option) => (
            <li key={option.value}>
              <button
                type="button"
                role="option"
                aria-selected={option.value === value}
                onClick={() => {
                  onChange?.(option.value)
                  setOpen(false)
                }}
                className={cn(
                  'flex w-full items-center gap-xs px-md py-xs text-left text-body whitespace-nowrap hover:bg-background-page',
                  option.value === value && 'font-semibold',
                )}
              >
                {option.color && (
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: option.color }}
                  />
                )}
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default Dropdown
