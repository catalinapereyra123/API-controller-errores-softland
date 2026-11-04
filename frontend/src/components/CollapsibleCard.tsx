import { useState, type ReactNode } from 'react'
import { colors, textStyles } from '../styles'
import { cn } from '../utils/cn'
import Card from './Card'
import { ChevronDownIcon } from './icons'

interface CollapsibleCardProps {
  title: string
  /** Línea chica debajo del título, visible también cerrada. */
  subtitle?: string
  defaultOpen?: boolean
  /** Para manejarla desde afuera (p. ej. abrirla antes de llevar a algo de adentro). */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: ReactNode
}

/** Tarjeta que se pliega y despliega tocando el título o la flechita. */
function CollapsibleCard({
  title,
  subtitle,
  defaultOpen = true,
  open: openControlado,
  onOpenChange,
  children,
}: CollapsibleCardProps) {
  const [openPropio, setOpenPropio] = useState(defaultOpen)
  const open = openControlado ?? openPropio

  function alternar() {
    setOpenPropio(!open)
    onOpenChange?.(!open)
  }

  return (
    <Card>
      <button
        type="button"
        onClick={alternar}
        aria-expanded={open}
        className="group flex w-full cursor-pointer items-center justify-between gap-md text-left"
      >
        <span className="flex min-w-0 flex-col gap-xxs">
          <span style={{ ...textStyles.h3, color: colors.gray.darkest }}>
            {title}
          </span>
          {subtitle && (
            <span className="text-bodySmall text-gray-medium">{subtitle}</span>
          )}
        </span>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors group-hover:bg-background-subtle">
          <ChevronDownIcon
            className={cn(
              'h-5 w-5 transition-transform duration-300',
              open && 'rotate-180',
            )}
            style={{ color: colors.gray.default }}
          />
        </span>
      </button>
      {/* grid-rows 0fr → 1fr anima la altura sin medirla. */}
      <div
        inert={!open}
        className={cn(
          'grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
          open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="pt-lg">{children}</div>
        </div>
      </div>
    </Card>
  )
}

export default CollapsibleCard
