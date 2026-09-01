import { Transform } from 'class-transformer';
import {
  IsISO8601,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

const trim = ({ value }: { value: unknown }): string =>
  typeof value === 'string' ? value.trim() : '';

const trimOrNull = ({ value }: { value: unknown }): string | null => {
  if (typeof value !== 'string') return null;
  const t = value.trim();
  return t.length === 0 ? null : t;
};

/**
 * Un error tal cual lo manda n8n en el flujo 1 (sync cada 3 h).
 * n8n hace UN POST con el array completo de errores de todas las empresas.
 *
 * {
 *   "empresa": "IFLOW",
 *   "empresaNombre": "I FLOW S.A.",   // opcional
 *   "modulo": "3. Compras",
 *   "identi": "LIQ29948",
 *   "statusSoftland": "E",
 *   "error": "Se ha producido un error...",
 *   "cuenta": "9167",
 *   "fecha": "2026-08-11T00:00:00"     // opcional
 * }
 */
export class SyncErrorDto {
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  @Transform(trim)
  empresa!: string; // código de empresa

  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Transform(trimOrNull)
  empresaNombre?: string | null;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @Transform(trim)
  modulo!: string; // texto crudo: "3. Compras"

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @Transform(trim)
  identi!: string;

  @IsString()
  @IsIn(['E', 'X', 'D', 'B', 'N', 'S'])
  @MinLength(1)
  @MaxLength(10)
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : '',
  )
  statusSoftland!: string; // E, X, D, B, N, S

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @Transform(trimOrNull)
  error?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(trimOrNull)
  cuenta?: string | null;

  @IsOptional()
  @IsISO8601()
  @Transform(trimOrNull)
  fecha?: string | null;
}
