import { colors, fontFamily, fontWeight, textStyles } from '../styles'
import type { ErrorItem } from '../types'
import { cn } from '../utils/cn'
import { formatCurrency } from '../utils/format'
import Card from './Card'

interface ErrorItemsTableProps {
  items: ErrorItem[]
}

const GRID =
  'grid grid-cols-[56px_minmax(180px,1fr)_90px_140px_140px_80px] gap-md'

const COLUMNS = [
  'Ítem',
  'Artículo',
  'Cantidad',
  'Precio unit.',
  'Importe',
  'Tipo',
]

const mono = fontFamily.mono.join(', ')

/** Detalle de ítems de la transacción con error (SAR_*RMVI). */
function ErrorItemsTable({ items }: ErrorItemsTableProps) {
  return (
    <Card padding="none" className="overflow-x-auto">
      <div className="min-w-[720px]">
        <div
          style={{ backgroundColor: colors.background.subtle }}
          className={cn(GRID, 'rounded-t-xl px-lg py-sm')}
        >
          {COLUMNS.map((label, index) => (
            <span
              key={label}
              style={{
                ...textStyles.overline,
                fontWeight: fontWeight.semibold,
                color: colors.gray.medium,
              }}
              className={cn(
                'uppercase',
                (index === 2 || index === 3 || index === 4) && 'text-right',
              )}
            >
              {label}
            </span>
          ))}
        </div>

        {items.map((item) => (
          <div
            key={item.nroItem}
            style={{ borderColor: colors.background.border }}
            className={cn(
              GRID,
              'items-start border-b px-lg py-md last:border-b-0',
            )}
          >
            <span
              style={{
                ...textStyles.bodySmall,
                fontFamily: mono,
                fontWeight: fontWeight.semibold,
                color: colors.gray.medium,
              }}
            >
              {item.nroItem}
            </span>

            <div className="flex flex-col gap-xxs">
              <span
                style={{
                  ...textStyles.body,
                  fontWeight: fontWeight.bold,
                  color: colors.gray.darkest,
                }}
              >
                {item.descripcion}
              </span>
              <span
                style={{
                  ...textStyles.caption,
                  fontFamily: mono,
                  color: colors.gray.default,
                }}
              >
                {item.articulo}
              </span>
            </div>

            <span
              style={{ ...textStyles.bodySmall, color: colors.gray.dark }}
              className="text-right"
            >
              {item.cantidad}
            </span>
            <span
              style={{ ...textStyles.bodySmall, color: colors.gray.dark }}
              className="text-right"
            >
              {formatCurrency(item.precioUnitario)}
            </span>
            <span
              style={{
                ...textStyles.bodySmall,
                fontWeight: fontWeight.semibold,
                color: colors.gray.darkest,
              }}
              className="text-right"
            >
              {formatCurrency(item.importe)}
            </span>
            <span
              style={{
                ...textStyles.bodySmall,
                fontFamily: mono,
                color: colors.gray.medium,
              }}
            >
              {item.tipo}
            </span>
          </div>
        ))}
      </div>
    </Card>
  )
}

export default ErrorItemsTable
