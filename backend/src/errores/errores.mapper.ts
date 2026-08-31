import { BadRequestException } from '@nestjs/common';
import type {
  Empresa,
  EventoTrazabilidad,
  Observacion,
  TransaccionError,
  Usuario,
} from '../../generated/prisma/client';
import { EstadoApp, Modulo } from '../../generated/prisma/client';

/** Etiqueta legible por módulo (la que muestra el front). */
export const MODULO_LABEL: Record<Modulo, string> = {
  FACTURACION: 'Facturación',
  COMPRAS: 'Compras',
  COBRANZAS: 'Cobranzas',
};

/** Etiqueta legible por estado de gestión. */
export const ESTADO_LABEL: Record<EstadoApp, string> = {
  ERROR: 'Error',
  ASIGNADO: 'Asignado',
  EN_PROGRESO: 'En progreso',
  REPROCESANDO: 'Reprocesando',
  REQUIERE_CORRECCION: 'Requiere corrección',
  RESUELTO: 'Resuelto',
};

/** Un error se considera "abierto" mientras no esté RESUELTO. */
export const ESTADOS_ABIERTOS: EstadoApp[] = [
  EstadoApp.ERROR,
  EstadoApp.ASIGNADO,
  EstadoApp.EN_PROGRESO,
  EstadoApp.REPROCESANDO,
  EstadoApp.REQUIERE_CORRECCION,
];

/**
 * Estados que se pueden setear a mano desde la app (PATCH /errores/:id/estado).
 * REPROCESANDO / REQUIERE_CORRECCION / RESUELTO los controla SOLO el flujo de
 * reproceso: RESUELTO tiene que venir de Softland (statusSoftland = S).
 */
export const ESTADOS_MANUALES: EstadoApp[] = [
  EstadoApp.ERROR,
  EstadoApp.ASIGNADO,
  EstadoApp.EN_PROGRESO,
];

/** Tipo de evento de trazabilidad según el estado (define el ícono en el front). */
export function tipoEventoPorEstado(estado: EstadoApp): string {
  if (estado === EstadoApp.ASIGNADO || estado === EstadoApp.EN_PROGRESO) {
    return 'asignacion';
  }
  if (estado === EstadoApp.REPROCESANDO || estado === EstadoApp.RESUELTO) {
    return 'reproceso';
  }
  return 'error';
}

/** Status de Softland que significan "sigue fallando". */
export function statusEsError(status: string): boolean {
  return ['E', 'D', 'B', 'X'].includes(status);
}

/**
 * Normaliza el texto de módulo de Softland ("1. Facturacion", "3. Compras",
 * "2. Cobranzas / Recibos", ...) al enum interno.
 * Lanza 400 si no se puede reconocer, así el llamador reporta el registro
 * en vez de archivarlo mal.
 */
export function parseModulo(raw: string): Modulo {
  const texto = raw.trim().toLowerCase();
  const numero = texto.match(/^(\d+)/)?.[1];

  if (numero === '1') return Modulo.FACTURACION;
  if (numero === '2') return Modulo.COBRANZAS;
  if (numero === '3') return Modulo.COMPRAS;

  if (texto.includes('factur')) return Modulo.FACTURACION;
  if (texto.includes('compr')) return Modulo.COMPRAS;
  if (texto.includes('cobr') || texto.includes('recib')) {
    return Modulo.COBRANZAS;
  }

  throw new BadRequestException(`Módulo no reconocido: "${raw}"`);
}

/** Extrae la ruta del archivo de log de un mensaje de Softland, si existe. */
export function extractArchivoLog(
  mensaje: string | null | undefined,
): string | null {
  if (!mensaje) return null;
  const match = mensaje.match(/verificar el archivo\s+(.+?\.txt)/i);
  return match ? match[1].trim() : null;
}

type TransaccionConRelaciones = TransaccionError & {
  empresa?: Empresa | null;
  responsable?: Usuario | null;
  observaciones?: Observacion[];
  eventos?: EventoTrazabilidad[];
};

/**
 * Forma "plana" que consume la bandeja del front (tipo `ErrorTransaccion`).
 * Mantener alineado con frontend/src/types/index.ts (el front necesita sumar
 * los estados REPROCESANDO y REQUIERE_CORRECCION a `ErrorEstado`).
 */
export function toErrorTransaccion(t: TransaccionConRelaciones) {
  return {
    id: t.id,
    codigo: t.identi,
    estado: t.estadoApp,
    empresaId: t.empresaCodigo,
    modulo: MODULO_LABEL[t.modulo],
    descripcion: descripcionDe(t),
    responsableId: t.responsableId,
    abiertoDesde: t.fechaDeteccion.toISOString(),
    intentos: t.intentos,
    // Campos extra (el front los ignora si no los usa):
    moduloCodigo: t.modulo,
    statusSoftland: t.statusSoftland,
    cuenta: t.cuenta,
    fechaMovimiento: t.fechaMovimiento ? t.fechaMovimiento.toISOString() : null,
    archivoLog: t.archivoLog,
    corregidoPorId: t.corregidoPorId,
    corregidoPor: t.corregidoPorNombre,
    fechaCorreccion: t.fechaCorreccion ? t.fechaCorreccion.toISOString() : null,
    fechaResolucion: t.fechaResolucion ? t.fechaResolucion.toISOString() : null,
    ultimaDeteccion: t.ultimaDeteccion.toISOString(),
    presenteEnUltimaSync: t.presenteEnUltimaSync,
  };
}

export type ErrorTransaccionDto = ReturnType<typeof toErrorTransaccion>;

function descripcionDe(t: TransaccionError): string {
  if (t.errorMensaje) return t.errorMensaje;
  if (t.statusSoftland === 'X') return 'Transacción excluida del proceso.';
  return '—';
}
