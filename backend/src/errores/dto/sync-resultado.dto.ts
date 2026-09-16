/** Resumen que devuelve POST /errores/sync. */
export interface SyncResultadoDto {
  recibidos: number;
  empresas: number;
  creados: number;
  actualizados: number;
  /** Errores que estaban RESUELTOS y volvieron a llegar desde Softland. */
  reaparecidos: number;
  /** Reprocesos en curso que Softland confirmó OK (status S explícito en el feed). */
  reprocesadosOk: number;
  /** Reprocesos en curso que volvieron a fallar (status E/D/B/X). */
  regresiones: number;
  /**
   * ALARMA: reprocesos en curso que dejaron de figurar en el feed sin
   * verificación. NO se resuelven solos; hay que confirmar el IDENTI (flujo 4).
   */
  reprocesandoSinConfirmar: number;
  /** Registros que no se pudieron procesar (módulo desconocido, etc.). */
  ignorados: number;
  /**
   * Errores de las empresas de este lote que ya NO figuran en Softland
   * y siguen abiertos internamente (candidatos a cerrar).
   */
  desaparecidos: number;
  detalleIgnorados: { identi: string; empresa: string; motivo: string }[];
  procesadoEn: string;
}

/**
 * Respuesta de GET /errores/integracion/reproceso-pendiente (flujo 2).
 * Siempre trae los mismos campos: iFlow no acepta un 200 sin body. Si no hay
 * nada para pasar a N, `hayPendiente` es false y el resto viene en null.
 */
export interface ReprocesoPendienteDto {
  hayPendiente: boolean;
  id: string | null;
  empresa: string | null;
  modulo: string | null;
  moduloOrigen: string | null;
  identi: string | null;
  solicitadoEn: string | null;
  notificado: boolean | null;
  intentos: number | null;
}

/** Resultado de POST /errores/resultado-reproceso (flujo 4 de n8n). */
export interface ResultadoReprocesoResultadoDto {
  ok: boolean;
  estadoApp: string;
  statusSoftland: string;
  mensaje: string;
}

/** Una clave a verificar (GET /errores/integracion/verificacion-pendientes). */
export interface VerificacionPendienteDto {
  id: string;
  empresa: string;
  modulo: string;
  /** Texto crudo de Softland ("3. Compras"): sirve para elegir la tabla. */
  moduloOrigen: string;
  identi: string;
  /** Último status conocido por la app, para comparar. */
  statusConocido: string;
  /** ISO o null si nunca se verificó. */
  ultimaVerificacion: string | null;
}

/** Resultado de POST /errores/verificacion (flujo 5). */
export interface VerificacionResultadoDto {
  ok: boolean;
  estadoApp: string;
  /** Lo que reportó el integrador; null = la consulta no devolvió filas. */
  statusSoftland: string | null;
  /** true si esta verificación cerró el error. */
  cerrado: boolean;
  /** true si esta verificación reabrió un error que estaba RESUELTO. */
  reabierto: boolean;
  mensaje: string;
}
