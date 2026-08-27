import type { CSSProperties, ReactNode } from 'react'
import { colors, fontWeight, spacing, textStyles } from '../styles'
import { cn } from '../utils/cn'

type SpacingKey = keyof typeof spacing

export interface TimelineItem {
  id: string
  /** Icono dentro del nodo. Si se omite se dibuja un punto con `iconColor`. */
  icon?: ReactNode
  iconColor?: string
  iconBackground?: string
  /** Texto chico sobre el título: hora, fecha, número de paso, etc. */
  time?: ReactNode
  title: ReactNode
  description?: ReactNode
  /** Contenido libre debajo de la descripción (badges, botones, etc.). */
  children?: ReactNode
}

interface TimelineProps {
  items: TimelineItem[]
  /** Color de la línea que conecta los nodos. */
  connectorColor?: string
  /** Color por defecto del icono/punto de cada nodo. */
  nodeColor?: string
  /** Fondo por defecto del nodo. */
  nodeBackground?: string
  timeColor?: string
  titleColor?: string
  descriptionColor?: string
  /** Diámetro del nodo (cualquier unidad CSS). */
  nodeSize?: string
  /** Separación vertical entre nodos, tomada de los tokens de spacing. */
  gap?: SpacingKey
  /** Contenido opcional al pie (ej. link "Ver historial completo"). */
  footer?: ReactNode
  className?: string
}

/**
 * Línea de tiempo genérica y reutilizable. No conoce ningún dominio: recibe
 * una lista de `items` con texto libre y colores opcionales, así sirve para
 * trazabilidad de errores, historial de estados, pasos de un proceso, etc.
 * Soporta cualquier cantidad de nodos.
 */
function Timeline({
  items,
  connectorColor = colors.background.border,
  nodeColor = colors.gray.medium,
  nodeBackground = colors.gray.light,
  timeColor = colors.gray.default,
  titleColor = colors.gray.darkest,
  descriptionColor = colors.gray.medium,
  nodeSize = spacing.xl,
  gap = 'lg',
  footer,
  className,
}: TimelineProps) {
  return (
    <div className={cn('flex flex-col', className)}>
      {items.map((item, index) => {
        const isLast = index === items.length - 1

        return (
          <div key={item.id} className="flex gap-sm">
            <div className="flex flex-col items-center">
              <span
                style={
                  {
                    width: nodeSize,
                    height: nodeSize,
                    color: item.iconColor ?? nodeColor,
                    backgroundColor: item.iconBackground ?? nodeBackground,
                  } as CSSProperties
                }
                className="flex shrink-0 items-center justify-center rounded-full"
              >
                {item.icon ?? (
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: 'currentColor' }}
                  />
                )}
              </span>
              {!isLast && (
                <span
                  style={{ backgroundColor: connectorColor }}
                  className="w-px flex-1"
                />
              )}
            </div>

            <div
              className="flex flex-col gap-xxs"
              style={{
                paddingBottom: isLast ? undefined : spacing[gap],
              }}
            >
              {item.time != null && (
                <span style={{ ...textStyles.caption, color: timeColor }}>
                  {item.time}
                </span>
              )}
              <span
                style={{
                  ...textStyles.bodySmall,
                  fontWeight: fontWeight.bold,
                  color: titleColor,
                }}
              >
                {item.title}
              </span>
              {item.description != null && (
                <span
                  style={{ ...textStyles.caption, color: descriptionColor }}
                >
                  {item.description}
                </span>
              )}
              {item.children}
            </div>
          </div>
        )
      })}

      {footer != null && <div className="pt-xs">{footer}</div>}
    </div>
  )
}

export default Timeline
