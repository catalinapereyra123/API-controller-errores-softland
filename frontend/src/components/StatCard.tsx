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
}

function StatCard({
  label,
  value,
  labelColor,
  valueColor,
  backgroundColor,
  trend,
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
      <span
        style={{ color: labelColor }}
        className="text-caption font-bold tracking-wide uppercase"
      >
        {label}
      </span>

      <span style={{ color: valueColor }} className="text-display font-bold">
        {value}
      </span>

      {trend && (
        <span
          style={{ color: trend.color }}
          className="inline-flex items-center gap-xs text-body font-semibold"
        >
          <span aria-hidden>{trend.direction === 'down' ? '▼' : '▲'}</span>
          {trend.text}
        </span>
      )}
    </div>
  )
}

export default StatCard
