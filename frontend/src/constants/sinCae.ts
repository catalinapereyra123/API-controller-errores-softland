import { colors } from '../styles'
import type { ClaseCae, DiagnosticoSinCae } from '../types'

/** Etiqueta y color de cada diagnóstico de un comprobante sin CAE. */
export const DIAGNOSTICO_SIN_CAE: Record<
  DiagnosticoSinCae,
  { label: string; color: string; background: string }
> = {
  TRABA_PV: {
    label: 'Traba el PV',
    color: colors.label.red.text,
    background: colors.label.red.background,
  },
  FECHA_ANTERIOR: {
    label: 'Fecha anterior',
    color: colors.label.red.text,
    background: colors.label.red.background,
  },
  RECHAZO_ARCA: {
    label: 'ARCA lo rechazó',
    color: colors.label.red.text,
    background: colors.label.red.background,
  },
  NO_ENVIADO: {
    label: 'No se envió a ARCA',
    color: colors.label.orange.text,
    background: colors.label.orange.background,
  },
  SIN_DATOS_ENVIO: {
    label: 'Sin datos del envío',
    color: colors.label.gray.text,
    background: colors.label.gray.background,
  },
  YA_NO_FIGURA: {
    label: 'Ya no figura',
    color: colors.label.gray.text,
    background: colors.label.gray.background,
  },
}

export const CLASE_CAE_LABEL: Record<ClaseCae, string> = {
  FCE: 'FCE',
  LOCAL: 'Local',
  EXPORTACION: 'Exportación',
}
