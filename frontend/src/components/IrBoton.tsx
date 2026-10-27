import type { ButtonHTMLAttributes } from 'react'
import { ArrowUpRightIcon } from './icons'
import { cn } from '../utils/cn'

interface IrBotonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'children'
> {
  /** A dónde lleva; queda como aria-label y tooltip. */
  label: string
  /** `oscuro`: sobre una tarjeta verde u oscura. */
  tono?: 'claro' | 'oscuro'
}

/**
 * La flechita ↗ de la esquina de cada tarjeta: lleva a la pantalla que tiene
 * el detalle de lo que muestra. Dentro de un `group` acompaña el hover.
 */
function IrBoton({ label, tono = 'claro', className, ...props }: IrBotonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        'flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full transition-all duration-200',
        tono === 'claro'
          ? 'bg-background-surface text-gray-dark ring-1 ring-background-border group-hover:bg-primary-default group-hover:text-white group-hover:ring-primary-default hover:bg-primary-default hover:text-white hover:ring-primary-default'
          : 'bg-white/15 text-white ring-1 ring-white/25 group-hover:bg-white group-hover:text-primary-dark hover:bg-white hover:text-primary-dark',
        'focus-visible:ring-2 focus-visible:ring-primary-default/50 focus-visible:ring-offset-2 focus-visible:outline-none',
        className,
      )}
      {...props}
    >
      <ArrowUpRightIcon className="h-4 w-4 transition-transform duration-200 group-hover:rotate-45" />
    </button>
  )
}

export default IrBoton
