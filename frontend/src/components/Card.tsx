import type { CSSProperties, HTMLAttributes, ReactNode } from 'react'
import { colors, radius, spacing } from '../styles'
import { cn } from '../utils/cn'

type SpacingKey = keyof typeof spacing
type RadiusKey = keyof typeof radius

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  /** Padding interno tomado de los tokens de spacing. `none` deja el contenido a ras. */
  padding?: SpacingKey | 'none'
  /** Radio de los bordes tomado de los tokens de radius. */
  radiusSize?: RadiusKey
  backgroundColor?: string
  borderColor?: string
  shadow?: boolean
}

/**
 * Rectángulo base reutilizable: superficie con bordes redondeados y sombra opcional.
 * Se usa para las tarjetas de contenido, paneles laterales y bloques destacados.
 */
function Card({
  children,
  padding = 'lg',
  radiusSize = 'xl',
  backgroundColor = colors.background.surface,
  borderColor,
  shadow = true,
  className,
  style,
  ...props
}: CardProps) {
  return (
    <div
      style={
        {
          backgroundColor,
          borderRadius: radius[radiusSize],
          padding: padding === 'none' ? undefined : spacing[padding],
          border: borderColor ? `1px solid ${borderColor}` : undefined,
          ...style,
        } as CSSProperties
      }
      className={cn(shadow && 'shadow-md', className)}
      {...props}
    >
      {children}
    </div>
  )
}

export default Card
