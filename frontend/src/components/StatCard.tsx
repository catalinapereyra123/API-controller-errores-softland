import type { HTMLAttributes, ReactNode } from 'react'
import { colors } from '../styles'
import { cn } from '../utils/cn'
import IrBoton from './IrBoton'

interface StatCardTrend {
  text: string
  color: string
  direction?: 'up' | 'down'
}

interface StatCardProps extends HTMLAttributes<HTMLDivElement> {
  label: string
  value: ReactNode
  labelColor: string
  valueColor: string
  backgroundColor: string
  trend?: StatCardTrend
  /** Aclaración secundaria debajo de la tendencia. */
  note?: string
  icon?: ReactNode
  iconColor?: string
  iconBackground?: string
  /** Verde lleno: el número principal de la pantalla. */
  destacada?: boolean
  /** Si viene, la tarjeta entera lleva a esa pantalla (con la flechita ↗). */
  onIr?: () => void
  irLabel?: string
}

function StatCard({
  label,
  value,
  labelColor,
  valueColor,
  backgroundColor,
  trend,
  note,
  icon,
  iconColor,
  iconBackground,
  destacada = false,
  onIr,
  irLabel,
  className,
  ...props
}: StatCardProps) {
  const clickeable = Boolean(onIr)

  return (
    <div
      role={clickeable ? 'link' : undefined}
      tabIndex={clickeable ? 0 : undefined}
      onClick={onIr}
      onKeyDown={(event) => {
        if (onIr && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault()
          onIr()
        }
      }}
      style={{ background: destacada ? colors.primary.hero : backgroundColor }}
      className={cn(
        'group relative flex w-full flex-col gap-md overflow-hidden rounded-xxl p-lg',
        destacada
          ? 'text-white shadow-lift'
          : 'shadow-soft ring-1 ring-slate-900/[0.04]',
        clickeable &&
          'cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift focus-visible:ring-2 focus-visible:ring-primary-default/50 focus-visible:outline-none',
        className,
      )}
      {...props}
    >
      {/* Halo en la esquina: da identidad a cada métrica. */}
      {destacada ? (
        <>
          <span
            aria-hidden
            className="pointer-events-none absolute -right-12 -bottom-16 h-44 w-44 rounded-full border-[28px] border-white/[0.07]"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute -top-10 -left-10 h-32 w-32 rounded-full bg-white/10 blur-2xl"
          />
        </>
      ) : (
        iconBackground && (
          <span
            aria-hidden
            style={{ backgroundColor: iconBackground }}
            className="pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full opacity-50 blur-2xl"
          />
        )
      )}

      <div className="relative flex min-h-10 items-center justify-between gap-sm">
        {icon ? (
          <span
            style={
              destacada
                ? undefined
                : { color: iconColor, backgroundColor: iconBackground }
            }
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
              destacada && 'bg-white/15 text-white',
            )}
          >
            {icon}
          </span>
        ) : (
          <span />
        )}
        {onIr && (
          <IrBoton
            label={irLabel ?? label}
            tono={destacada ? 'oscuro' : 'claro'}
            tabIndex={-1}
            onClick={(event) => {
              event.stopPropagation()
              onIr()
            }}
          />
        )}
      </div>

      <span className="relative flex flex-col gap-xs">
        <span
          style={destacada ? undefined : { color: labelColor }}
          className={cn(
            'text-bodySmall font-semibold',
            destacada && 'text-white/85',
          )}
        >
          {label}
        </span>
        <span
          style={destacada ? undefined : { color: valueColor }}
          className="text-cifra font-medium tracking-tight tabular-nums"
        >
          {value}
        </span>
      </span>

      {trend && (
        <span
          style={
            destacada
              ? undefined
              : { color: trend.color, backgroundColor: `${trend.color}14` }
          }
          className={cn(
            'relative inline-flex w-fit items-center gap-xs rounded-full px-sm py-xxs text-caption font-semibold',
            destacada && 'bg-white/15 text-white',
          )}
        >
          {trend.direction && (
            <span aria-hidden className="text-[0.625rem]">
              {trend.direction === 'down' ? '▼' : '▲'}
            </span>
          )}
          {trend.text}
        </span>
      )}

      {note && (
        <span
          style={destacada ? undefined : { color: labelColor }}
          className={cn(
            'relative -mt-sm text-caption',
            destacada && 'text-white/70',
          )}
        >
          {note}
        </span>
      )}
    </div>
  )
}

export default StatCard
