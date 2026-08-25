export type ErrorEstado =
  'ERROR' | 'PENDIENTE' | 'ASIGNADO' | 'EN_PROGRESO' | 'CORREGIDO' | 'RESUELTO'

export interface Empresa {
  id: string
  nombre: string
}

export interface Usuario {
  id: string
  nombre: string
  rol: string
  avatarIniciales: string
}

export interface ErrorPrioritario {
  id: string
  codigo: string
  estado: ErrorEstado
  empresaId: string
  modulo: string
  descripcion: string
  responsableId: string | null
  abiertoDesde: string
}

export interface DashboardStats {
  erroresAbiertos: number
  erroresAbiertosDelta: number
  pendientesReproceso: number
  resueltosHoy: number
  resueltosHoyDelta: number
  sinResponsable: number
  tiempoPromedioResolucionMinutos: number
  tiempoPromedioResolucionDeltaMinutos: number
  bandejaPendientes: number
}
