import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

const normalizar = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

/** POST /auth/registro */
export class RegistroDto {
  @IsEmail({}, { message: 'El email no es válido.' })
  @Transform(({ value }: { value: unknown }): unknown =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  email!: string;

  @IsString()
  @MinLength(8, { message: 'La contraseña necesita al menos 8 caracteres.' })
  @MaxLength(72)
  password!: string;

  @IsString()
  @MinLength(2, { message: 'El nombre es obligatorio.' })
  @MaxLength(80)
  @Transform(normalizar)
  nombre!: string;

  /** Opcional: si no viene, se usa el rol por defecto del modelo. */
  @IsOptional()
  @IsString()
  @MaxLength(60)
  @Transform(normalizar)
  rol?: string;
}
