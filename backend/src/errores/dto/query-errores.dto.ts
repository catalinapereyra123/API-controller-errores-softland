import { Transform } from 'class-transformer';
import { IsEnum, IsIn, IsOptional, IsString } from 'class-validator';
import { EstadoApp, Modulo } from '../../../generated/prisma/client';

/**
 * Filtros opcionales para GET /errores y GET /errores/agrupados.
 * Todos son query params (?empresa=AMCARG&modulo=COMPRAS...).
 */
export class QueryErroresDto {
  @IsOptional()
  @IsString()
  @Transform(({ value }) => String(value).trim())
  empresa?: string;

  @IsOptional()
  @IsEnum(Modulo)
  modulo?: Modulo;

  @IsOptional()
  @IsEnum(EstadoApp)
  estado?: EstadoApp;

  @IsOptional()
  @IsString()
  responsableId?: string;

  /** `true` => solo errores abiertos (no RESUELTO). Default: true. */
  @IsOptional()
  @IsIn(['true', 'false'])
  soloAbiertos?: 'true' | 'false';
}
