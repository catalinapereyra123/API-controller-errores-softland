import type { CSSProperties } from 'react'
import { cn } from '../utils/cn'

interface TableProps {
  title: string
  subtitle: string
  actionText: string
  actionColor: string
  onActionClick?: () => void
  rows: number
  columns: number
  backgroundColor: string
  titleColor: string
  subtitleColor: string
  dividerColor: string
  cellPlaceholderColor: string
  className?: string
}

function Table({
  title,
  subtitle,
  actionText,
  actionColor,
  onActionClick,
  rows,
  columns,
  backgroundColor,
  titleColor,
  subtitleColor,
  dividerColor,
  cellPlaceholderColor,
  className,
}: TableProps) {
  return (
    <div
      style={{ backgroundColor }}
      className={cn('w-full rounded-xl shadow-md', className)}
    >
      <div
        style={{ borderColor: dividerColor }}
        className="flex items-start justify-between gap-md border-b px-lg py-lg"
      >
        <div className="flex flex-col gap-xxs">
          <span style={{ color: titleColor }} className="text-h3 font-bold">
            {title}
          </span>
          <span style={{ color: subtitleColor }} className="text-bodySmall">
            {subtitle}
          </span>
        </div>

        <button
          type="button"
          onClick={onActionClick}
          style={{ color: actionColor }}
          className="inline-flex shrink-0 items-center gap-xs text-bodySmall font-bold transition-opacity hover:opacity-80"
        >
          {actionText}
          <span aria-hidden>→</span>
        </button>
      </div>

      <div>
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div
            key={rowIndex}
            style={
              {
                borderColor: dividerColor,
                gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
              } as CSSProperties
            }
            className={cn(
              'grid items-center gap-md px-lg py-md',
              rowIndex < rows - 1 && 'border-b',
            )}
          >
            {Array.from({ length: columns }).map((__, colIndex) => (
              <div
                key={colIndex}
                style={{ backgroundColor: cellPlaceholderColor }}
                className="h-4 rounded-md"
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export default Table
