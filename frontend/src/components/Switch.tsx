import type { ButtonHTMLAttributes } from 'react'
import { cn } from '../utils/cn'

interface SwitchProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'onChange' | 'children'
> {
  checked: boolean
  onChange: (checked: boolean) => void
  /** Queda como aria-label y tooltip. */
  label: string
  /** `oscuro`: sobre una tarjeta verde u oscura. */
  tono?: 'claro' | 'oscuro'
}

/** Interruptor de pastilla (activar / pausar). */
function Switch({
  checked,
  onChange,
  label,
  tono = 'claro',
  className,
  ...props
}: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      title={label}
      onClick={(event) => {
        event.stopPropagation()
        onChange(!checked)
      }}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors duration-200',
        checked
          ? tono === 'claro'
            ? 'bg-primary-default'
            : 'bg-brand-lime'
          : tono === 'claro'
            ? 'bg-gray-light'
            : 'bg-white/20',
        'focus-visible:ring-2 focus-visible:ring-primary-default/50 focus-visible:ring-offset-2 focus-visible:outline-none',
        'disabled:pointer-events-none disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <span
        aria-hidden
        className={cn(
          'h-5 w-5 rounded-full bg-white shadow-soft transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]',
          checked && 'translate-x-5',
        )}
      />
    </button>
  )
}

export default Switch
