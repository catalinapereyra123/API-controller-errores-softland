import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import {
  IndicadorObjetivo,
  Modulo,
  SentidoMeta,
  TipoObjetivo,
} from '../../../generated/prisma/client';
import type { EstadoObjetivo } from '../calculo';
import type { IndicadorInfo } from '../catalogo';

export const PERIODOS_OBJETIVO = [7, 30, 90] as const;

const recortar = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

/** '' llega de los selects "Todos": se guarda como null. */
const vacioANull = ({ value }: { value: unknown }): unknown =>
  value === '' ? null : value;

/** POST /objetivos */
export class CrearObjetivoDto {
  @IsEnum(TipoObjetivo)
  tipo!: TipoObjetivo;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  @Transform(recortar)
  nombre!: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  @Transform(recortar)
  descripcion?: string | null;

  @IsEnum(IndicadorObjetivo)
  indicador!: IndicadorObjetivo;

  @IsNumber()
  @Min(0)
  meta!: number;

  @IsEnum(SentidoMeta)
  sentido!: SentidoMeta;

  @IsOptional()
  @IsIn(PERIODOS_OBJETIVO)
  periodoDias?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(720)
  umbralHoras?: number | null;

  @IsOptional()
  @Transform(vacioANull)
  @IsEnum(Modulo)
  modulo?: Modulo | null;

  @IsOptional()
  @Transform(vacioANull)
  @IsString()
  empresaCodigo?: string | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  valorManual?: number | null;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  /** Sólo KR: la NSM a la que aporta. */
  @IsOptional()
  @Transform(vacioANull)
  @IsString()
  padreId?: string | null;
}

/** PATCH /objetivos/:id — cualquier campo del alta (p. ej. sólo `activo`). */
export class ActualizarObjetivoDto {
  @IsOptional()
  @IsEnum(TipoObjetivo)
  tipo?: TipoObjetivo;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  @Transform(recortar)
  nombre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  @Transform(recortar)
  descripcion?: string | null;

  @IsOptional()
  @IsEnum(IndicadorObjetivo)
  indicador?: IndicadorObjetivo;

  @IsOptional()
  @IsNumber()
  @Min(0)
  meta?: number;

  @IsOptional()
  @IsEnum(SentidoMeta)
  sentido?: SentidoMeta;

  @IsOptional()
  @IsIn(PERIODOS_OBJETIVO)
  periodoDias?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(720)
  umbralHoras?: number | null;

  @IsOptional()
  @Transform(vacioANull)
  @IsEnum(Modulo)
  modulo?: Modulo | null;

  @IsOptional()
  @Transform(vacioANull)
  @IsString()
  empresaCodigo?: string | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  valorManual?: number | null;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @IsOptional()
  @Transform(vacioANull)
  @IsString()
  padreId?: string | null;
}

export interface ObjetivoDto {
  id: string;
  tipo: TipoObjetivo;
  nombre: string;
  descripcion: string | null;
  indicador: IndicadorObjetivo;
  unidad: IndicadorInfo['unidad'];
  meta: number;
  sentido: SentidoMeta;
  periodoDias: number;
  umbralHoras: number | null;
  modulo: Modulo | null;
  empresaCodigo: string | null;
  /** "Facturación · PAE": los filtros en texto; null = sin filtro. */
  alcance: string | null;
  valorManual: number | null;
  activo: boolean;
  padreId: string | null;
  /** null = sin datos para medir en el período. */
  valor: number | null;
  /** El mismo valor en el período anterior; null en los de "ahora" y manuales. */
  anterior: number | null;
  /** 0–100 del camino a la meta. */
  progreso: number | null;
  estado: EstadoObjetivo;
  creadoPorNombre: string | null;
  actualizadoEn: string;
}

/** GET /objetivos (y lo que devuelve cada cambio). */
export interface ObjetivosDto {
  catalogo: IndicadorInfo[];
  /** NSM primero, después los KR, cada grupo en su orden. */
  objetivos: ObjetivoDto[];
  calculadoEn: string;
}
