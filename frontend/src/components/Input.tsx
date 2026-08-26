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
  className?: string
}

function Input({
  icon,
  color,
  borderColor,
  backgroundColor,
  className,
  ...props
}: InputProps) {
  return (
    <div
      style={{ borderColor, backgroundColor }}
      className={cn(
        'inline-flex items-center gap-sm rounded-md border px-md py-sm',
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
