import type { ButtonHTMLAttributes } from 'react'
import { ChevronRightIcon } from './icons'
import { cn } from '../utils/cn'

interface ChevronButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'color'
> {
  color: string
  borderColor: string
  backgroundColor?: string
}

/**
 * Flecha "abrir". Dentro de una fila con `group` acompaña el hover de la fila.
 */
function ChevronButton({
  color,
  borderColor,
  backgroundColor,
  className,
  ...props
}: ChevronButtonProps) {
  return (
    <button
      type="button"
      style={{ color, borderColor, backgroundColor }}
      className={cn(
        'flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border transition-all duration-150',
        'group-hover:translate-x-0.5 group-hover:border-primary-light group-hover:bg-primary-lightest hover:bg-primary-lightest',
        'focus-visible:ring-2 focus-visible:ring-primary-default/50 focus-visible:ring-offset-2 focus-visible:outline-none',
        'disabled:pointer-events-none disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <ChevronRightIcon className="h-4 w-4" />
    </button>
  )
}

export default ChevronButton
