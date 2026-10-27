import { Type } from 'class-transformer';
import { IsIn, IsOptional } from 'class-validator';

/** Períodos que ofrece la pantalla de Métricas. */
export const PERIODOS_METRICAS = [7, 30, 90] as const;

/** GET /metricas?dias=30 — días hacia atrás, contando hoy. Default: 30. */
export class QueryMetricasDto {
  @IsOptional()
  @Type(() => Number)
  @IsIn(PERIODOS_METRICAS)
  dias?: number;
}

/** Cantidad de cada hito en un período. */
export interface TotalesMetricasDto {
  llegadas: number;
  asignaciones: number;
  correcciones: number;
  resoluciones: number;
  /** De las resoluciones, las que cerró la verificación automática. */
  resolucionesAutomaticas: number;
  fallos: number;
  reapariciones: number;
  descartes: number;
}

export interface PuntoMetricasDto {
  /** yyyy-mm-dd */
  id: string;
  /** "23/10" */
  etiqueta: string;
  llegadas: number;
  asignaciones: number;
  correcciones: number;
  resoluciones: number;
}

export interface GrupoMetricasDto {
  /** Código del módulo o de la empresa. */
  id: string;
  label: string;
  llegadas: number;
  resoluciones: number;
}

export interface PersonaMetricasDto {
  usuarioId: string;
  nombre: string;
  asignaciones: number;
  correcciones: number;
  resoluciones: number;
}

export interface MetricasDto {
  periodo: string;
  desde: string;
  totales: TotalesMetricasDto;
  /** Los mismos totales en el período anterior de igual largo (para la tendencia). */
  anteriores: TotalesMetricasDto;
  /** Promedios en minutos desde la detección; null si no hubo casos. */
  tiempos: {
    asignacion: number | null;
    correccion: number | null;
    resolucion: number | null;
  };
  /** % de reprocesos con resultado que quedaron en S; null si no hubo. */
  efectividad: number | null;
  serie: PuntoMetricasDto[];
  porModulo: GrupoMetricasDto[];
  /** Las que más errores trajeron, de mayor a menor (hasta 6). */
  porEmpresa: GrupoMetricasDto[];
  /** Quién movió más cosas, de más a menos. */
  porPersona: PersonaMetricasDto[];
  /** Cómo está la bandeja ahora (no depende del período). */
  ahora: {
    abiertos: number;
    sinResponsable: number;
    reprocesando: number;
  };
}
