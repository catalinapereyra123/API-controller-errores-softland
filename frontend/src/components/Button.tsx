import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react'
import { cn } from '../utils/cn'

interface ButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'color' | 'style'
> {
  text: string
  color: string
  size?: CSSProperties
  variant?: 'solid' | 'outline' | 'text'
  icon?: ReactNode
  trailingIcon?: ReactNode
}

function Button({
  text,
  color,
  size,
  variant = 'solid',
  icon,
  trailingIcon,
  className,
  ...props
}: ButtonProps) {
  const isOutline = variant === 'outline'
  const isText = variant === 'text'

  return (
    <button
      type="button"
      style={{
        backgroundColor: isOutline || isText ? 'transparent' : color,
        borderColor: isOutline ? color : undefined,
        color: isOutline || isText ? color : undefined,
        ...size,
      }}
      className={cn(
        'inline-flex items-center justify-center gap-xs font-medium transition-opacity hover:opacity-90',
        isOutline && 'rounded-full border',
        isText && 'rounded-md',
        !isOutline && !isText && 'rounded-md text-white',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-default focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-50',
        className,
      )}
      {...props}
    >
      {icon}
      {text}
      {trailingIcon}
    </button>
  )
}

export default Button
