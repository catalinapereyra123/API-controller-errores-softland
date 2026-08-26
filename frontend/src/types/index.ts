export type ErrorEstado =
  'ERROR' | 'PENDIENTE' | 'ASIGNADO' | 'EN_PROGRESO' | 'CORREGIDO' | 'RESUELTO'

export type AppPage = 'home' | 'bandeja'

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

export interface ErrorTransaccion {
  id: string
  codigo: string
  estado: ErrorEstado
  empresaId: string
  modulo: string
  descripcion: string
  responsableId: string | null
  abiertoDesde: string
  intentos: number
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
