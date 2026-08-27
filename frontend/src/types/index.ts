export type ErrorEstado =
  'ERROR' | 'PENDIENTE' | 'ASIGNADO' | 'EN_PROGRESO' | 'CORREGIDO' | 'RESUELTO'

export type AppPage = 'home' | 'bandeja' | 'detalle' | 'historial'

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

export interface ErrorObservacion {
  id: string
  autor: string
  iniciales: string
  hace: string
  texto: string
}

export type TrazabilidadTipo =
  'error' | 'asignacion' | 'observacion' | 'reproceso'

export interface TrazabilidadEvento {
  id: string
  hora: string
  titulo: string
  detalle: string
  tipo: TrazabilidadTipo
}

export interface HistorialEvento {
  id: string
  hora: string
  tipo: TrazabilidadTipo
  titulo: string
  codigo: string
  empresa: string
  usuario: string
}

export interface HistorialDia {
  id: string
  etiqueta: string
  fecha: string
  eventos: HistorialEvento[]
}

export interface HistorialResumen {
  periodo: string
  resueltos: number
  reprocesos: number
  observaciones: number
  reasignaciones: number
  dias: HistorialDia[]
}

export interface ErrorItem {
  nroItem: number
  articulo: string
  descripcion: string
  cantidad: number
  precioUnitario: number
  importe: number
  tipo: string
}

export interface ErrorDetalle {
  id: string
  codigo: string
  estado: ErrorEstado
  empresa: string
  proceso: string
  proveedorCodigo: string
  detectadoEn: string
  tiempoAbierto: string
  intentos: number
  mensajeSoftland: string
  tablaSoftland: string
  cabecera: {
    proveedor: string
    fechaComprobante: string
    estadoActual: string
    importeTotal: number
    importeAplicado: number
    diferencia: number
  }
  items: ErrorItem[]
  responsable: {
    nombre: string
    iniciales: string
    asignadaHace: string
  } | null
  observaciones: ErrorObservacion[]
  trazabilidad: TrazabilidadEvento[]
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
