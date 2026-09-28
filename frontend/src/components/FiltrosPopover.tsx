import { useEffect, useRef, useState, type ReactNode } from 'react'
import { colors } from '../styles'
import { cn } from '../utils/cn'
import { FiltersIcon } from './icons'

interface FiltrosPopoverProps {
  /** Cuántos filtros difieren del valor por defecto (se muestra como badge). */
  activos: number
  onLimpiar: () => void
  /** Los `Dropdown` de cada filtro. */
  children: ReactNode
}

/**
 * Botón "tres rayitas" que despliega un panel con los filtros secundarios.
 * Cierra con Escape o con un clic afuera (los menús de los Dropdown quedan
 * adentro del panel, así que elegir una opción no lo cierra).
 */
function FiltrosPopover({ activos, onLimpiar, children }: FiltrosPopoverProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    function handleClickOutside(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
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
  }, [open])

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="dialog"
        style={{
          borderColor:
            activos > 0 ? colors.primary.light : colors.background.border,
        }}
        className={cn(
          'inline-flex h-full cursor-pointer items-center gap-sm rounded-lg border bg-background-surface px-md py-sm text-body font-semibold text-gray-dark shadow-xs transition-shadow hover:shadow-soft',
          'focus-visible:ring-4 focus-visible:ring-primary-light/60 focus-visible:outline-none',
          open && 'ring-4 ring-primary-light/60',
        )}
      >
        <FiltersIcon className="h-5 w-5" />
        Filtros
        {activos > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-default px-xs text-caption font-bold text-white tabular-nums">
            {activos}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Filtros"
          className="absolute right-0 z-30 mt-xs w-[min(340px,calc(100vw-2rem))] animate-aparecer rounded-2xl border border-background-border bg-background-surface p-md shadow-lift"
        >
          <div className="mb-md flex items-center justify-between gap-md">
            <span className="text-bodyLarge font-bold text-gray-darkest">
              Filtros
            </span>
            <button
              type="button"
              onClick={onLimpiar}
              disabled={activos === 0}
              className="cursor-pointer rounded-md px-xs py-xxs text-bodySmall font-bold text-primary-dark transition-opacity hover:opacity-75 disabled:pointer-events-none disabled:opacity-40"
            >
              Limpiar
            </button>
          </div>
          <div className="flex flex-col gap-sm">{children}</div>
        </div>
      )}
    </div>
  )
}

export default FiltrosPopover
