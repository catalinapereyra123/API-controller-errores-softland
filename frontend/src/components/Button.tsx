import type { ButtonHTMLAttributes } from 'react'
import { cn } from '../utils/cn'

type ButtonColor = 'primary' | 'success' | 'warning' | 'error' | 'info' | 'gray'
type ButtonSize = 'sm' | 'md' | 'lg'

type ButtonProps = {
  text: string
  color?: ButtonColor
  size?: ButtonSize
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'color'>

const colorClasses: Record<ButtonColor, string> = {
  primary: 'bg-primary-default text-gray-white',
  success: 'bg-status-success text-gray-white',
  warning: 'bg-status-warning text-gray-darkest',
  error: 'bg-status-error text-gray-white',
  info: 'bg-status-info text-gray-white',
  gray: 'bg-gray-dark text-gray-white',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'text-bodySmall px-sm py-xs',
  md: 'text-body px-md py-sm',
  lg: 'text-bodyLarge px-lg py-sm',
}

function Button({ text, color = 'primary', size = 'md', className, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'rounded-md font-medium transition hover:brightness-90 active:brightness-95 disabled:cursor-not-allowed disabled:opacity-50',
        colorClasses[color],
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {text}
    </button>
  )
}

export default Button
