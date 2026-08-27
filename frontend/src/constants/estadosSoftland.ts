import { colors } from '../styles'

export interface EstadoSoftland {
  code: string
  label: string
  description: string
  /** Color del círculo (texto). */
  color: string
  /** Fondo del círculo. */
  background: string
}

// Estados de Softland / SAR_CORMVH_STATUS.
export const ESTADOS_SOFTLAND: EstadoSoftland[] = [
  {
    code: 'N',
    label: 'Nuevo',
    description: 'Nuevo / pendiente de procesar',
    color: colors.label.blue.text,
    background: colors.label.blue.background,
  },
  {
    code: 'S',
    label: 'Procesado correctamente',
    description: 'La transacción se procesó sin inconvenientes',
    color: colors.label.green.text,
    background: colors.label.green.background,
  },
  {
    code: 'E',
    label: 'Error técnico',
    description: 'Falló el procesamiento por un problema técnico',
    color: colors.label.red.text,
    background: colors.label.red.background,
  },
  {
    code: 'D',
    label: 'Diferencia / inconsistencia',
    description: 'Por ejemplo, temas de importes o impuestos',
    color: colors.label.orange.text,
    background: colors.label.orange.background,
  },
  {
    code: 'B',
    label: 'Bloqueo por regla de negocio',
    description: 'Una regla de negocio frenó el procesamiento',
    color: colors.label.purple.text,
    background: colors.label.purple.background,
  },
]
