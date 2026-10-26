import {
  AsignadoTag,
  DescartadoTag,
  EnProgresoTag,
  ErrorTag,
  ReprocesandoTag,
  RequiereCorreccionTag,
  ResueltoTag,
} from '../components/Tag'
import type { ErrorEstado, ErrorTransaccion } from '../types'

export const estadoTagByEstado: Record<ErrorEstado, () => React.JSX.Element> = {
  ERROR: ErrorTag,
  ASIGNADO: AsignadoTag,
  EN_PROGRESO: EnProgresoTag,
  REPROCESANDO: ReprocesandoTag,
  REQUIERE_CORRECCION: RequiereCorreccionTag,
  RESUELTO: ResueltoTag,
  DESCARTADO: DescartadoTag,
}

export const estadoLabels: Record<ErrorEstado, string> = {
  ERROR: 'Error',
  ASIGNADO: 'Asignado',
  EN_PROGRESO: 'En progreso',
  REPROCESANDO: 'Reprocesando',
  REQUIERE_CORRECCION: 'Requiere corrección',
  RESUELTO: 'Resuelto',
  DESCARTADO: 'Descartado',
}

export const estadoOrder: ErrorEstado[] = [
  'ERROR',
  'ASIGNADO',
  'EN_PROGRESO',
  'REPROCESANDO',
  'REQUIERE_CORRECCION',
  'RESUELTO',
  'DESCARTADO',
]

/** Cerrados: fuera de "Abiertos" en la bandeja y sin tiempo abierto. */
export const ESTADOS_CERRADOS: ErrorEstado[] = ['RESUELTO', 'DESCARTADO']

/**
 * Status X de Softland: la transacción quedó fuera del proceso, sin mensaje de
 * error. Mientras siga abierta no se trata como un error a resolver: va al
 * final de la bandeja y no suma en los contadores (igual que en el dashboard).
 */
export function esExcluida(
  error: Pick<ErrorTransaccion, 'statusSoftland' | 'estado'>,
): boolean {
  return (
    error.statusSoftland === 'X' && !ESTADOS_CERRADOS.includes(error.estado)
  )
}
