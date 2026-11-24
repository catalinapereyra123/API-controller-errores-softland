/**
 * Minuto de cada hora en que corre cada workflow de Studio. Tienen que
 * coincidir con el CRON de cada flujo: si se cambia ahí, se cambia acá.
 */
export const MINUTO_SYNC = {
  /** Flujo 4080 "errores softland cata" (FSOF-0002), CRON 0 *\/1 * * *. */
  errores: 0,
  /** Flujo 4169 "errores softland cata - Sin CAE" (FSOF-0005), CRON 45 *\/1 * * *. */
  sinCae: 45,
} as const
