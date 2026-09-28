import type { InputHTMLAttributes, ReactNode } from 'react'
import { cn } from '../utils/cn'

interface InputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'color'
> {
  icon?: ReactNode
  color: string
  borderColor: string
  backgroundColor?: string
  /** Más alto y con bordes de pastilla (formularios de acceso). */
  pill?: boolean
  className?: string
}

function Input({
  icon,
  color,
  borderColor,
  backgroundColor,
  pill = false,
  className,
  ...props
}: InputProps) {
  return (
    <div
      style={{ borderColor, backgroundColor }}
      className={cn(
        'inline-flex items-center gap-sm border shadow-xs transition-shadow',
        pill ? 'rounded-full px-lg py-md' : 'rounded-lg px-md py-sm',
        'focus-within:ring-4 focus-within:ring-primary-light/60',
        className,
      )}
    >
      {icon}
      <input
        style={{ color }}
        className="w-full min-w-0 bg-transparent text-body outline-none placeholder:text-gray-default"
        {...props}
      />
    </div>
  )
}

export default Input
