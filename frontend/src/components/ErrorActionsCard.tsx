import { colors, fontWeight, spacing, textStyles } from '../styles'
import Button from './Button'
import Card from './Card'
import { CheckCircleIcon } from './icons'

interface ErrorActionsCardProps {
  onMarkAsFixed?: () => void
  disabled?: boolean
}

/**
 * Bloque de acciones del detalle de error. El flujo siempre es el mismo
 * ("marcar como corregido" → reproceso), así que el texto va fijo.
 */
function ErrorActionsCard({ onMarkAsFixed, disabled }: ErrorActionsCardProps) {
  return (
    <Card>
      <span style={{ ...textStyles.h3, color: colors.gray.darkest }}>
        Acciones
      </span>

      <Button
        text="Marcar como corregido"
        color={colors.primary.default}
        icon={<CheckCircleIcon className="h-4 w-4" />}
        onClick={onMarkAsFixed}
        disabled={disabled}
        size={{
          ...textStyles.body,
          fontWeight: fontWeight.bold,
          padding: `${spacing.md} ${spacing.lg}`,
        }}
        className="mt-md w-full"
      />

      <p
        style={{ ...textStyles.caption, color: colors.gray.medium }}
        className="mt-sm"
      >
        Al marcar como corregido, la transacción se reprocesa y vuelve a estado
        N. Si el reproceso finaliza en S, quedará resuelta. Si no, deberá
        corregirse nuevamente.
      </p>
    </Card>
  )
}

export default ErrorActionsCard
