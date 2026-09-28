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
        'inline-flex cursor-pointer items-center justify-center gap-xs font-medium transition-all duration-150 active:scale-[0.98]',
        isOutline && 'rounded-full border hover:bg-slate-900/[0.04]',
        isText && 'rounded-md hover:opacity-75',
        !isOutline &&
          !isText &&
          'rounded-lg text-white shadow-sm hover:shadow-md hover:brightness-95',
        'focus-visible:ring-2 focus-visible:ring-primary-default/50 focus-visible:ring-offset-2 focus-visible:outline-none',
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
