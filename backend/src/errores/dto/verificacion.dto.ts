import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

const trim = ({ value }: { value: unknown }): string =>
  typeof value === 'string' ? value.trim() : '';

const trimOrNull = ({ value }: { value: unknown }): string | null => {
  if (typeof value !== 'string') return null;
  const t = value.trim();
  return t.length === 0 ? null : t;
};

const upperOrNull = ({ value }: { value: unknown }): string | null => {
  if (typeof value !== 'string') return null;
  const t = value.trim().toUpperCase();
  return t.length === 0 ? null : t;
};

/**
 * Flujo 5 — el integrador reporta el status que hoy tiene una transacción en
 * Softland. A diferencia del flujo 4, acá nadie pidió un reproceso: es una
 * lectura periódica para detectar los errores que se arreglaron por afuera.
 *
 * {
 *   "empresa": "IFLOW",
 *   "modulo": "3. Compras",
 *   "identi": "LIQ29948",
 *   "statusSoftland": "S"          // S | E | B | D | X | N; vacío = no figura
 * }
 *
 * `statusSoftland` vacío o ausente significa "la consulta no devolvió filas".
 * No se interpreta como resuelto: ver ErroresService.registrarVerificacion.
 */
export class VerificacionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  @Transform(trim)
  empresa!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @Transform(trim)
  modulo!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @Transform(trim)
  identi!: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  @Transform(upperOrNull)
  statusSoftland?: string | null;

  /** Mensaje de error actual, si la consulta lo trae. Opcional. */
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @Transform(trimOrNull)
  error?: string | null;
}
