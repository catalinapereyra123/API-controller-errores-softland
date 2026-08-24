import type { ButtonHTMLAttributes, CSSProperties } from 'react'
import { cn } from '../utils/cn'

interface ButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'color' | 'style'
> {
  text: string
  color: string
  size?: CSSProperties
}

function Button({ text, color, size, className, ...props }: ButtonProps) {
  return (
    <button
      type="button"
      style={{ backgroundColor: color, ...size }}
      className={cn(
        'inline-flex items-center justify-center rounded-md font-medium text-white transition-opacity hover:opacity-90',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-default focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-50',
        className,
      )}
      {...props}
    >
      {text}
    </button>
  )
}

export default Button
