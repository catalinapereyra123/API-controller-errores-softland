import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '../utils/cn'

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
  icon?: ReactNode
  iconColor?: string
  iconBackground?: string
}

function StatCard({
  label,
  value,
  labelColor,
  valueColor,
  backgroundColor,
  trend,
  icon,
  iconColor,
  iconBackground,
  className,
  ...props
}: StatCardProps) {
  return (
    <div
      style={{ backgroundColor }}
      className={cn(
        'relative flex w-full flex-col gap-md overflow-hidden rounded-xl p-lg shadow-soft ring-1 ring-slate-900/5',
        className,
      )}
      {...props}
    >
      {/* Halo del color del ícono en la esquina: da identidad a cada métrica. */}
      {iconBackground && (
        <span
          aria-hidden
          style={{ backgroundColor: iconBackground }}
          className="pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full opacity-60 blur-2xl"
        />
      )}

      <div className="relative flex items-center justify-between gap-sm">
        <span
          style={{ color: labelColor }}
          className="text-caption font-bold tracking-wide uppercase"
        >
          {label}
        </span>
        {icon && (
          <span
            style={{ color: iconColor, backgroundColor: iconBackground }}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          >
            {icon}
          </span>
        )}
      </div>

      <span
        style={{ color: valueColor }}
        className="relative text-display leading-none tabular-nums"
      >
        {value}
      </span>

      {trend && (
        <span
          style={{ color: trend.color }}
          className="relative inline-flex items-center gap-xs text-bodySmall font-semibold"
        >
          {trend.direction && (
            <span aria-hidden className="text-[0.625rem]">
              {trend.direction === 'down' ? '▼' : '▲'}
            </span>
          )}
          {trend.text}
        </span>
      )}
    </div>
  )
}

export default StatCard
