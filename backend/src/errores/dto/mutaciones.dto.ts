import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { EstadoApp } from '../../../generated/prisma/client';

/** PATCH /errores/:id/asignacion */
export class AsignarDto {
  /** id del usuario responsable, o `null` para desasignar. */
  @IsOptional()
  @IsString()
  @Transform(({ value }): string | null =>
    typeof value === 'string' && value !== '' ? value : null,
  )
  responsableId?: string | null;

  /** id de quien hace la acción (provisorio hasta que haya auth). */
  @IsOptional()
  @IsString()
  autorId?: string;
}

/** PATCH /errores/:id/estado (transiciones de gestión: ASIGNADO, EN_PROGRESO...). */
export class CambiarEstadoDto {
  @IsEnum(EstadoApp)
  estado!: EstadoApp;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  nota?: string;

  @IsOptional()
  @IsString()
  autorId?: string;
}

/** POST /errores/:id/observaciones */
export class CrearObservacionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  @Transform(({ value }): unknown =>
    typeof value === 'string' ? value.trim() : value,
  )
  texto!: string;

  @IsOptional()
  @IsString()
  autorId?: string;
}

/** POST /errores/:id/reproceso ("marcar como corregido y reprocesar"). */
export class SolicitarReprocesoDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @Transform(({ value }): unknown =>
    typeof value === 'string' ? value.trim() : value,
  )
  observacion?: string;

  @IsOptional()
  @IsString()
  autorId?: string;
}
