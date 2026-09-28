import { Type } from 'class-transformer';
import { IsIn, IsOptional } from 'class-validator';

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
  dias: HistorialDiaDto[];
}
