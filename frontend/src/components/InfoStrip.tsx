import type { ReactNode } from 'react'
import { colors, fontWeight, textStyles } from '../styles'
import Card from './Card'

export interface InfoStripItem {
  label: string
  value: ReactNode
}

interface InfoStripProps {
  items: InfoStripItem[]
  labelColor?: string
  valueColor?: string
  backgroundColor?: string
  className?: string
}

/**
 * Tira horizontal de pares label / valor dentro de una `Card`.
 * Genérica: recibe cualquier cantidad de `items` y se acomoda con wrap.
 */
function InfoStrip({
  items,
  labelColor = colors.gray.default,
  valueColor = colors.gray.darkest,
  backgroundColor,
  className,
}: InfoStripProps) {
  return (
    <Card backgroundColor={backgroundColor} className={className}>
      <dl className="flex flex-wrap gap-lg">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex min-w-[120px] flex-1 flex-col gap-xxs"
          >
            <dt
              style={{
                ...textStyles.overline,
                fontWeight: fontWeight.semibold,
                color: labelColor,
              }}
              className="uppercase"
            >
              {item.label}
            </dt>
            <dd
              style={{
                ...textStyles.body,
                fontWeight: fontWeight.bold,
                color: valueColor,
              }}
            >
              {item.value}
            </dd>
          </div>
        ))}
      </dl>
    </Card>
  )
}

export default InfoStrip
