import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { CheckIcon, ChevronDownIcon } from './icons'
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
  textColor?: string
  backgroundColor?: string
  value?: string
  onChange?: (value: string) => void
  size?: CSSProperties
  className?: string
}

function Dropdown({
  text,
  options,
  color,
  textColor,
  backgroundColor,
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
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        style={{
          borderColor: color,
          color: textColor ?? color,
          backgroundColor,
          ...size,
        }}
        className={cn(
          'flex w-full cursor-pointer items-center justify-between gap-sm rounded-lg border px-md py-sm text-body font-medium shadow-xs transition-shadow hover:shadow-soft',
          'focus-visible:ring-4 focus-visible:ring-primary-light/60 focus-visible:outline-none',
          open && 'ring-4 ring-primary-light/60',
        )}
      >
        <span className="truncate">{selected?.label ?? text}</span>
        <ChevronDownIcon
          aria-hidden
          className={cn(
            'h-4 w-4 shrink-0 text-gray-default transition-transform duration-200',
            open && 'rotate-180',
          )}
        />
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute z-30 mt-xs max-h-72 min-w-full animate-aparecer overflow-y-auto rounded-xl border border-background-border bg-background-surface p-xs shadow-lift"
        >
          {options.map((option) => {
            const isSelected = option.value === value

            return (
              <li key={option.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange?.(option.value)
                    setOpen(false)
                  }}
                  className={cn(
                    'flex w-full cursor-pointer items-center gap-xs rounded-lg px-sm py-sm text-left text-body whitespace-nowrap text-gray-dark transition-colors hover:bg-background-page',
                    isSelected &&
                      'bg-primary-lightest font-semibold text-primary-dark hover:bg-primary-lightest',
                  )}
                >
                  {option.color && (
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: option.color }}
                    />
                  )}
                  <span className="flex-1">{option.label}</span>
                  {isSelected && (
                    <CheckIcon aria-hidden className="ml-sm h-4 w-4 shrink-0" />
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export default Dropdown
