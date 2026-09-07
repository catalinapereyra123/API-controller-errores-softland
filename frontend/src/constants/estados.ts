import {
  AsignadoTag,
  EnProgresoTag,
  ErrorTag,
  ReprocesandoTag,
  RequiereCorreccionTag,
  ResueltoTag,
} from '../components/Tag'
import type { ErrorEstado } from '../types'

export const estadoTagByEstado: Record<ErrorEstado, () => React.JSX.Element> = {
  ERROR: ErrorTag,
  ASIGNADO: AsignadoTag,
  EN_PROGRESO: EnProgresoTag,
  REPROCESANDO: ReprocesandoTag,
  REQUIERE_CORRECCION: RequiereCorreccionTag,
  RESUELTO: ResueltoTag,
}

export const estadoLabels: Record<ErrorEstado, string> = {
  ERROR: 'Error',
  ASIGNADO: 'Asignado',
  EN_PROGRESO: 'En progreso',
  REPROCESANDO: 'Reprocesando',
  REQUIERE_CORRECCION: 'Requiere corrección',
  RESUELTO: 'Resuelto',
}

export const estadoOrder: ErrorEstado[] = [
  'ERROR',
  'ASIGNADO',
  'EN_PROGRESO',
  'REPROCESANDO',
  'REQUIERE_CORRECCION',
  'RESUELTO',
]
