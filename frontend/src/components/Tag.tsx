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
        'inline-flex w-fit min-w-[92px] shrink-0 items-center justify-center gap-xs rounded-full px-sm py-xxs text-caption font-bold tracking-wide uppercase',
        className,
      )}
      {...props}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      {text}
    </span>
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

export function AsignadoTag() {
  return (
    <Tag
      text="Asignado"
      color={colors.label.blue.text}
      backgroundColor={colors.label.blue.background}
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

export function ReprocesandoTag() {
  return (
    <Tag
      text="Reprocesando"
      color={colors.label.purple.text}
      backgroundColor={colors.label.purple.background}
    />
  )
}

/** El reproceso volvió a fallar: hay que corregir de nuevo. */
export function RequiereCorreccionTag() {
  return (
    <Tag
      text="A corregir"
      color={colors.label.red.text}
      backgroundColor={colors.label.red.background}
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

/** No interesa (p. ej. restos de pruebas): queda fuera de la bandeja. */
export function DescartadoTag() {
  return (
    <Tag
      text="Descartado"
      color={colors.label.gray.text}
      backgroundColor={colors.label.gray.background}
    />
  )
}

export default Tag
