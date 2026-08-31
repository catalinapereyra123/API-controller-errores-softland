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

/** Resultado de POST /errores/resultado-reproceso (flujo 4 de n8n). */
export interface ResultadoReprocesoResultadoDto {
  ok: boolean;
  estadoApp: string;
  statusSoftland: string;
  mensaje: string;
}
