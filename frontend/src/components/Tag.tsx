import type { HTMLAttributes } from 'react'
import { colors } from '../styles'
import { cn } from '../utils/cn'

interface TagProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'color'> {
  text: string
  color: string
  backgroundColor: string
}

export function Tag({
  text,
  color,
  backgroundColor,
  className,
  ...props
}: TagProps) {
  return (
    <span
      style={{ backgroundColor, color }}
      className={cn(
        'inline-flex items-center gap-xs rounded-full px-md py-xs text-bodySmall font-bold tracking-wide uppercase',
        className,
      )}
      {...props}
    >
      <span
        className="h-2 w-2 rounded-full"
        style={{ backgroundColor: color }}
      />
      {text}
    </span>
  )
}

export function PendienteTag() {
  return (
    <Tag
      text="Pendiente"
      color={colors.label.gray.text}
      backgroundColor={colors.label.gray.background}
    />
  )
}

export function ErrorTag() {
  return (
    <Tag
      text="Error"
      color={colors.label.red.text}
      backgroundColor={colors.label.red.background}
    />
  )
}

export function EnProgresoTag() {
  return (
    <Tag
      text="En progreso"
      color={colors.label.orange.text}
      backgroundColor={colors.label.orange.background}
    />
  )
}

export function CorregidoTag() {
  return (
    <Tag
      text="Corregido"
      color={colors.label.purple.text}
      backgroundColor={colors.label.purple.background}
    />
  )
}

export function ResueltoTag() {
  return (
    <Tag
      text="Resuelto"
      color={colors.label.green.text}
      backgroundColor={colors.label.green.background}
    />
  )
}

export function AsignadoTag() {
  return (
    <Tag
      text="Asignado"
      color={colors.label.blue.text}
      backgroundColor={colors.label.blue.background}
    />
  )
}

export default Tag
