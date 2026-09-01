import { Transform, Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { SyncErrorDto } from './sync-error.dto';

const trimCodigos = ({ value }: { value: unknown }): unknown => {
  if (!Array.isArray(value)) return value;
  return value.map((codigo: unknown) =>
    typeof codigo === 'string' ? codigo.trim() : codigo,
  );
};

/**
 * Lote completo de una ejecución del integrador.
 *
 * `empresasConsultadas` es independiente de `errores`: permite informar que
 * una empresa fue consultada aunque no haya devuelto registros. Sin esa lista
 * no es posible detectar que su último error desapareció.
 */
export class SyncRequestDto {
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @MaxLength(50, { each: true })
  @Transform(trimCodigos)
  empresasConsultadas: string[] = [];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyncErrorDto)
  errores!: SyncErrorDto[];
}
