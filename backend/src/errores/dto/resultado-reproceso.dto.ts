import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

const trim = ({ value }: { value: unknown }): string =>
  typeof value === 'string' ? value.trim() : '';

const trimOrNull = ({ value }: { value: unknown }): string | null => {
  if (typeof value !== 'string') return null;
  const t = value.trim();
  return t.length === 0 ? null : t;
};

/**
 * Flujo 4 de n8n: después de mandar la transacción a 'N', n8n consulta el
 * status en Softland y lo reporta acá.
 *
 * {
 *   "empresa": "IFLOW",
 *   "modulo": "3. Compras",
 *   "identi": "LIQ29948",
 *   "statusSoftland": "S",          // S | E | B | D | X | N
 *   "error": "nuevo ERRMSG..."      // opcional (cuando volvió a fallar)
 * }
 */
export class ResultadoReprocesoDto {
  @IsString()
  @MinLength(1)
  @Transform(trim)
  empresa!: string;

  @IsString()
  @MinLength(1)
  @Transform(trim)
  modulo!: string;

  @IsString()
  @MinLength(1)
  @Transform(trim)
  identi!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(10)
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : '',
  )
  statusSoftland!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @Transform(trimOrNull)
  error?: string | null;
}
