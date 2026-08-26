import type { DashboardStats, ErrorTransaccion } from '../types'

export const dashboardStatsMock: DashboardStats = {
  erroresAbiertos: 37,
  erroresAbiertosDelta: 5,
  pendientesReproceso: 9,
  resueltosHoy: 14,
  resueltosHoyDelta: 3,
  sinResponsable: 6,
  tiempoPromedioResolucionMinutos: 160,
  tiempoPromedioResolucionDeltaMinutos: -18,
  bandejaPendientes: 12,
}

const minutesAgo = (minutes: number) =>
  new Date(Date.now() - minutes * 60_000).toISOString()

export const erroresPrioritariosMock: ErrorTransaccion[] = [
  {
    id: '1',
    codigo: 'VIS-29904',
    estado: 'ERROR',
    empresaId: 'iflow',
    modulo: 'Compras',
    descripcion: 'Importe factura no coincide con ítems',
    responsableId: null,
    abiertoDesde: minutesAgo(134),
    intentos: 1,
  },
  {
    id: '2',
    codigo: 'VIS-29811',
    estado: 'PENDIENTE',
    empresaId: 'softland-corp',
    modulo: 'Cobranzas',
    descripcion: 'Cliente inexistente en cabecera',
    responsableId: null,
    abiertoDesde: minutesAgo(182),
    intentos: 0,
  },
  {
    id: '3',
    codigo: 'VIS-29790',
    estado: 'ASIGNADO',
    empresaId: 'iflow',
    modulo: 'Facturación',
    descripcion: 'ERRMSG vacío — sin detalle disponible',
    responsableId: 'martin-lopez',
    abiertoDesde: minutesAgo(340),
    intentos: 1,
  },
  {
    id: '4',
    codigo: 'VIS-29756',
    estado: 'ERROR',
    empresaId: 'softland-corp',
    modulo: 'Compras',
    descripcion: 'Proveedor bloqueado por retención',
    responsableId: null,
    abiertoDesde: minutesAgo(378),
    intentos: 2,
  },
]
