import {
  AsignadoTag,
  CorregidoTag,
  EnProgresoTag,
  ErrorTag,
  PendienteTag,
  ResueltoTag,
} from '../components/Tag'
import type { ErrorEstado } from '../types'

export const estadoTagByEstado: Record<ErrorEstado, () => React.JSX.Element> = {
  ERROR: ErrorTag,
  PENDIENTE: PendienteTag,
  ASIGNADO: AsignadoTag,
  EN_PROGRESO: EnProgresoTag,
  CORREGIDO: CorregidoTag,
  RESUELTO: ResueltoTag,
}

export const estadoLabels: Record<ErrorEstado, string> = {
  ERROR: 'Error',
  PENDIENTE: 'Pendiente',
  ASIGNADO: 'Asignado',
  EN_PROGRESO: 'En progreso',
  CORREGIDO: 'Corregido',
  RESUELTO: 'Resuelto',
}

export const estadoOrder: ErrorEstado[] = [
  'ERROR',
  'PENDIENTE',
  'ASIGNADO',
  'EN_PROGRESO',
  'CORREGIDO',
  'RESUELTO',
]
