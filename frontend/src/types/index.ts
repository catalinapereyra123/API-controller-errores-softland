/**
 * Espejo de lo que devuelve la API (backend/src/errores/*).
 * Si cambia un DTO del back, se cambia acá.
 */

/** Estado de gestión interno (enum `EstadoApp` del back). */
export type ErrorEstado =
  | 'ERROR'
  | 'ASIGNADO'
  | 'EN_PROGRESO'
  | 'REPROCESANDO'
  | 'REQUIERE_CORRECCION'
  | 'RESUELTO'
  | 'DESCARTADO'

/** Estados que la app puede setear a mano (el resto lo maneja el reproceso). */
export const ESTADOS_MANUALES: ErrorEstado[] = [
  'ERROR',
  'ASIGNADO',
  'EN_PROGRESO',
  'DESCARTADO',
]

/** Enum `Modulo` del back. */
export type ModuloCodigo = 'FACTURACION' | 'COMPRAS' | 'COBRANZAS'

export type AppPage = 'home' | 'bandeja' | 'detalle' | 'historial'

export interface Empresa {
  id: string
  nombre: string
}

export interface Usuario {
  id: string
  /** Sólo lo devuelven los endpoints de /auth (login, registro y me). */
  email?: string
  nombre: string
  rol: string
  avatarIniciales: string
}

/** Fila de la bandeja: `toErrorTransaccion` del back. */
export interface ErrorTransaccion {
  id: string
  /** IDENTI de Softland. */
  codigo: string
  estado: ErrorEstado
  empresaId: string
  empresaNombre: string
  /** Etiqueta legible del módulo: "Facturación", "Compras", "Cobranzas". */
  modulo: string
  moduloCodigo: ModuloCodigo
  /** Mensaje de error de Softland (o un texto por defecto). */
  descripcion: string
  responsableId: string | null
  /** ISO. Primera vez que se detectó. */
  abiertoDesde: string
  intentos: number
  /** Status crudo de Softland: E, X, D, B, N, S. */
  statusSoftland: string
  cuenta: string | null
  fechaMovimiento: string | null
  /** Ruta del c:\padron\...txt extraída del mensaje, si la hay. */
  archivoLog: string | null
  corregidoPorId: string | null
  corregidoPor: string | null
  fechaCorreccion: string | null
  fechaResolucion: string | null
  ultimaDeteccion: string
  presenteEnUltimaSync: boolean
}

export interface ErrorObservacion {
  id: string
  autor: string
  iniciales: string
  /** ISO. */
  hace: string
  texto: string
}

export type TrazabilidadTipo =
  'error' | 'asignacion' | 'observacion' | 'reproceso' | 'descarte'

export interface TrazabilidadEvento {
  id: string
  /** ISO. */
  hora: string
  titulo: string
  detalle: string
  tipo: TrazabilidadTipo
}

export interface IntentoReproceso {
  id: string
  numeroIntento: number
  statusAntes: string | null
  statusDespues: string | null
  usuarioId: string | null
  usuario: string | null
  observacion: string | null
  /** ISO. */
  fecha: string
  cerradoAt: string | null
}

/** GET /errores/:id */
export interface ErrorDetalle extends ErrorTransaccion {
  observaciones: ErrorObservacion[]
  trazabilidad: TrazabilidadEvento[]
  intentosReproceso: IntentoReproceso[]
}

export interface HistorialEvento {
  id: string
  /** ISO. */
  hora: string
  tipo: TrazabilidadTipo
  titulo: string
  detalle: string
  transaccionId: string
  codigo: string
  empresa: string
}

export interface HistorialDia {
  id: string
  etiqueta: string
  fecha: string
  eventos: HistorialEvento[]
}

/** GET /historial */
export interface HistorialResumen {
  periodo: string
  desde: string
  resueltos: number
  reprocesos: number
  observaciones: number
  reasignaciones: number
  dias: HistorialDia[]
}

/** GET /dashboard/stats */
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

/** Respuesta de POST /auth/login y POST /auth/registro. */
export interface Sesion {
  token: string
  /** Segundos de vida del token. */
  expiraEn: number
  usuario: Usuario
}
