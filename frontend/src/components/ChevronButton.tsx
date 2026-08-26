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
        'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-opacity hover:opacity-70',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-default focus-visible:ring-offset-2',
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
