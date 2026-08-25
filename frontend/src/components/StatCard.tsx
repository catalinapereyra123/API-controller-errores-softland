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
        'flex w-full flex-col gap-sm rounded-xl p-lg shadow-md',
        className,
      )}
      {...props}
    >
      <div className="flex items-center gap-sm">
        {icon && (
          <span
            style={{ color: iconColor, backgroundColor: iconBackground }}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
          >
            {icon}
          </span>
        )}
        <span
          style={{ color: labelColor }}
          className="text-caption font-bold tracking-wide uppercase"
        >
          {label}
        </span>
      </div>

      <span style={{ color: valueColor }} className="text-display font-bold">
        {value}
      </span>

      {trend && (
        <span
          style={{ color: trend.color }}
          className="inline-flex items-center gap-xs text-body font-semibold"
        >
          {trend.direction && (
            <span aria-hidden>{trend.direction === 'down' ? '▼' : '▲'}</span>
          )}
          {trend.text}
        </span>
      )}
    </div>
  )
}

export default StatCard
