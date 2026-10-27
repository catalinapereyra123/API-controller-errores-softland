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

/** `historial` es el propio (Mi historial); `historial-iris`, el de todo el equipo. */
export type AppPage =
  'home' | 'bandeja' | 'detalle' | 'metricas' | 'historial' | 'historial-iris'

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
  /** Cómo se cerró, si está RESUELTO. */
  origenCierre: 'MANUAL' | 'VERIFICACION_AUTOMATICA' | null
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

/** Error resuelto o mandado a reprocesar en el período (Historial y Mi espacio). */
export interface ErrorCierre extends ErrorTransaccion {
  /** `resuelto`: quedó en S. `corregido`: se mandó a reprocesar. */
  tipoCierre: 'resuelto' | 'corregido'
  /** ISO. fechaResolucion o fechaCorreccion según el tipo. */
  fechaCierre: string
  /** Quién lo corrigió; null si lo cerró la verificación automática. */
  cerradoPor: string | null
  /** De la detección a la resolución; null si todavía no se resolvió. */
  minutosResolucion: number | null
}

/** Un punto del gráfico: un día, o una hora si el período es "Hoy". */
export interface PuntoSerie {
  id: string
  /** "23/10" o "14 h". */
  etiqueta: string
  resueltos: number
  corregidos: number
}

/** GET /historial */
export interface HistorialResumen {
  periodo: string
  desde: string
  resueltos: number
  reprocesos: number
  observaciones: number
  reasignaciones: number
  /** Mandados a reprocesar en el período. */
  corregidos: number
  tiempoPromedioResolucionMinutos: number
  /** El cierre más reciente primero. */
  cierres: ErrorCierre[]
  serie: PuntoSerie[]
  dias: HistorialDia[]
}

/** GET /mi-espacio */
export interface MiEspacio {
  periodo: string
  desde: string
  metricas: {
    asignados: number
    asignadoMasViejoMinutos: number | null
    corregidos: number
    resueltos: number
    /** Reprocesos propios esperando el resultado de Softland. */
    esperandoResultado: number
    /** Reprocesos propios que volvieron con error. */
    fallidos: number
    /** % de reprocesos con resultado que salieron bien; null si no hubo. */
    efectividad: number | null
    tiempoPromedioResolucionMinutos: number
  }
  /** Abiertos con este responsable, el más viejo primero. */
  asignados: ErrorTransaccion[]
  /** Los que corrigió en el período, el más reciente primero. */
  corregidos: ErrorCierre[]
  porModulo: {
    modulo: ModuloCodigo
    label: string
    asignados: number
    corregidos: number
  }[]
  serie: PuntoSerie[]
}

/** GET /dashboard/stats */
export interface DashboardStats {
  /** Sin los de status X: esos van en `excluidasAbiertas`. */
  erroresAbiertos: number
  erroresAbiertosDelta: number
  /** Abiertos con status X (excluidos del proceso en Softland). */
  excluidasAbiertas: number
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

/** Cantidad de cada hito en un período (`TotalesMetricasDto` del back). */
export interface TotalesMetricas {
  llegadas: number
  asignaciones: number
  correcciones: number
  resoluciones: number
  /** De las resoluciones, las que cerró la verificación automática. */
  resolucionesAutomaticas: number
  fallos: number
  reapariciones: number
  descartes: number
}

export interface PuntoMetricas {
  /** yyyy-mm-dd */
  id: string
  /** "23/10" */
  etiqueta: string
  llegadas: number
  asignaciones: number
  correcciones: number
  resoluciones: number
}

export interface GrupoMetricas {
  /** Código del módulo o de la empresa. */
  id: string
  label: string
  llegadas: number
  resoluciones: number
}

export interface PersonaMetricas {
  usuarioId: string
  nombre: string
  asignaciones: number
  correcciones: number
  resoluciones: number
}

/** GET /metricas?dias= */
export interface Metricas {
  periodo: string
  desde: string
  totales: TotalesMetricas
  /** Los mismos totales en el período anterior de igual largo. */
  anteriores: TotalesMetricas
  /** Promedios en minutos desde la detección; null si no hubo casos. */
  tiempos: {
    asignacion: number | null
    correccion: number | null
    resolucion: number | null
  }
  /** % de reprocesos con resultado que quedaron en S; null si no hubo. */
  efectividad: number | null
  serie: PuntoMetricas[]
  porModulo: GrupoMetricas[]
  porEmpresa: GrupoMetricas[]
  porPersona: PersonaMetricas[]
  /** Cómo está la bandeja ahora (no depende del período). */
  ahora: {
    abiertos: number
    sinResponsable: number
    reprocesando: number
  }
}
