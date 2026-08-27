import type { ErrorDetalle } from '../types'

// Detalle de una transacción con error. Vendrá de GET /errores/:codigo.
export const errorDetailMock: ErrorDetalle = {
  id: '1',
  codigo: 'VIS-29904',
  estado: 'ERROR',
  empresa: 'iFlow',
  proceso: 'Compras · USR_CO',
  proveedorCodigo: '3306',
  detectadoEn: '21/08/2026 · 09:14',
  tiempoAbierto: '2h 14m',
  intentos: 1,
  mensajeSoftland:
    'Importe Factura no coincide con sumatoria de Items Aplicados.',
  tablaSoftland: 'SAP_CORMVH',
  cabecera: {
    proveedor: '3306 · Distribuidora del Sur SA',
    fechaComprobante: '19/08/2026',
    estadoActual: 'B',
    importeTotal: 1_248_500,
    importeAplicado: 1_196_300,
    diferencia: 52_200,
  },
  // Ítems de la transacción (SAR_CORMVI / SAR_FCRMVI).
  items: [
    {
      nroItem: 1,
      articulo: 'AB1000',
      descripcion: 'Flete terrestre — Ruta Norte',
      cantidad: 1,
      precioUnitario: 520_000,
      importe: 520_000,
      tipo: 'VT',
    },
    {
      nroItem: 2,
      articulo: 'AB1001',
      descripcion: 'Estadía y peajes',
      cantidad: 1,
      precioUnitario: 476_300,
      importe: 476_300,
      tipo: 'VT',
    },
    {
      nroItem: 3,
      articulo: 'AB1002',
      descripcion: 'Seguro de carga',
      cantidad: 1,
      precioUnitario: 252_200,
      importe: 252_200,
      tipo: 'VT',
    },
  ],
  responsable: {
    nombre: 'Catalina Ruiz',
    iniciales: 'CR',
    asignadaHace: 'Asignada hoy 10:40',
  },
  observaciones: [
    {
      id: 'o1',
      autor: 'Catalina Ruiz',
      iniciales: 'CR',
      hace: 'hace 34 min',
      texto:
        'Se verificaron los importes contra la factura original. El segundo item estaba cargado incorrectamente.',
    },
  ],
  trazabilidad: [
    {
      id: 't1',
      hora: '10:22',
      titulo: 'Error detectado',
      detalle: 'Estado B',
      tipo: 'error',
    },
    {
      id: 't2',
      hora: '10:40',
      titulo: 'Asignado a Catalina Ruiz',
      detalle: 'Asignado por Sistema',
      tipo: 'asignacion',
    },
    {
      id: 't3',
      hora: '11:19',
      titulo: 'Observación agregada',
      detalle: 'Por Catalina Ruiz',
      tipo: 'observacion',
    },
  ],
}
