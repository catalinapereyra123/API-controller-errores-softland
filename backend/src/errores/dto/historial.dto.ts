import { Type } from 'class-transformer';
import { IsIn, IsOptional } from 'class-validator';
import type { ErrorTransaccionDto } from '../errores.mapper';

/** Períodos que ofrece la pantalla de Historial. */
export const PERIODOS_HISTORIAL = [1, 7, 30, 90] as const;

/** GET /historial?dias=7 — días hacia atrás, contando hoy. Default: 7. */
export class QueryHistorialDto {
  @IsOptional()
  @Type(() => Number)
  @IsIn(PERIODOS_HISTORIAL)
  dias?: number;
}

/** Un evento de trazabilidad tal como lo muestra la pantalla de Historial. */
export interface HistorialEventoDto {
  id: string;
  /** ISO. El front decide cómo mostrarla. */
  hora: string;
  /** error | asignacion | observacion | reproceso */
  tipo: string;
  titulo: string;
  detalle: string;
  transaccionId: string;
  /** IDENTI de Softland. */
  codigo: string;
  empresa: string;
}

export interface HistorialDiaDto {
  /** yyyy-mm-dd, sirve de key. */
  id: string;
  /** "Hoy", "Ayer" o el día de la semana. */
  etiqueta: string;
  /** dd/mm/yyyy */
  fecha: string;
  eventos: HistorialEventoDto[];
}

export interface HistorialResumenDto {
  periodo: string;
  desde: string;
  resueltos: number;
  reprocesos: number;
  observaciones: number;
  reasignaciones: number;
  /** Mandados a reprocesar en el período (fechaCorreccion). */
  corregidos: number;
  /** De detección a resolución, sobre los resueltos del período. */
  tiempoPromedioResolucionMinutos: number;
  /** Resueltos o mandados a reprocesar en el período, el más reciente primero. */
  cierres: ErrorCierreDto[];
  serie: PuntoSerieDto[];
  dias: HistorialDiaDto[];
}

/**
 * Un error resuelto o corregido en el período. Lleva todo lo de la bandeja
 * (`ErrorTransaccionDto`) más cómo y cuándo se cerró.
 */
export interface CierreDto {
  /** `resuelto`: quedó en S en el período. `corregido`: se mandó a reprocesar. */
  tipoCierre: 'resuelto' | 'corregido';
  /** ISO. fechaResolucion o fechaCorreccion según el tipo. */
  fechaCierre: string;
  /** Quién lo corrigió; null si lo cerró la verificación automática. */
  cerradoPor: string | null;
  /** De la detección a la resolución; null si todavía no se resolvió. */
  minutosResolucion: number | null;
}

export type ErrorCierreDto = ErrorTransaccionDto & CierreDto;

/** Un punto del gráfico: un día (o una hora, si el período es "Hoy"). */
export interface PuntoSerieDto {
  /** yyyy-mm-dd o yyyy-mm-ddThh. */
  id: string;
  /** "23/10" o "14 h". */
  etiqueta: string;
  resueltos: number;
  corregidos: number;
}

/** GET /mi-espacio?dias=30 — lo del usuario logueado. Default: 30. */
export class QueryMiEspacioDto {
  @IsOptional()
  @Type(() => Number)
  @IsIn(PERIODOS_HISTORIAL)
  dias?: number;
}

export interface MiEspacioModuloDto {
  modulo: string;
  label: string;
  asignados: number;
  corregidos: number;
}

export interface MiEspacioDto {
  periodo: string;
  desde: string;
  metricas: {
    asignados: number;
    /** Minutos desde la detección del asignado más viejo; null si no hay. */
    asignadoMasViejoMinutos: number | null;
    corregidos: number;
    resueltos: number;
    /** Reprocesos propios que todavía esperan el resultado de Softland. */
    esperandoResultado: number;
    /** Reprocesos propios del período que volvieron con error. */
    fallidos: number;
    /** % de reprocesos con resultado que salieron bien; null si no hubo. */
    efectividad: number | null;
    tiempoPromedioResolucionMinutos: number;
  };
  /** Abiertos con este responsable, el más viejo primero. */
  asignados: ErrorTransaccionDto[];
  /** Los que corrigió en el período, el más reciente primero. */
  corregidos: ErrorCierreDto[];
  porModulo: MiEspacioModuloDto[];
  serie: PuntoSerieDto[];
}
