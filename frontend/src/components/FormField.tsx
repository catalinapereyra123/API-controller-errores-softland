import { useId, type InputHTMLAttributes, type ReactNode } from 'react'
import { colors, fontWeight, textStyles } from '../styles'
import Input from './Input'

interface FormFieldProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'color' | 'id'
> {
  label: string
  /** Mensaje de validación; si viene, el borde se pinta de rojo. */
  error?: string
  /** Texto de ayuda debajo del campo (se oculta cuando hay error). */
  ayuda?: string
  icon?: ReactNode
}

/**
 * Label + `Input` + mensaje de error. Encapsula el cableado de accesibilidad
 * (id, aria-invalid, aria-describedby) para no repetirlo en cada formulario.
 */
function FormField({ label, error, ayuda, icon, ...props }: FormFieldProps) {
  const id = useId()
  const mensajeId = `${id}-mensaje`
  const mensaje = error ?? ayuda

  return (
    <div className="flex flex-col gap-xs">
      <label
        htmlFor={id}
        style={{
          ...textStyles.bodySmall,
          fontWeight: fontWeight.bold,
          color: colors.gray.darkest,
        }}
      >
        {label}
      </label>

      <Input
        id={id}
        icon={icon}
        color={colors.gray.darkest}
        borderColor={error ? colors.status.error : colors.background.border}
        backgroundColor={colors.background.surface}
        aria-invalid={error ? true : undefined}
        aria-describedby={mensaje ? mensajeId : undefined}
        className="w-full"
        {...props}
      />

      {mensaje && (
        <span
          id={mensajeId}
          role={error ? 'alert' : undefined}
          style={{
            ...textStyles.caption,
            color: error ? colors.status.error : colors.gray.medium,
          }}
        >
          {mensaje}
        </span>
      )}
    </div>
  )
}

export default FormField
