import { Transform } from 'class-transformer';
import { IsEmail, IsString, MinLength } from 'class-validator';

/** POST /auth/login */
export class LoginDto {
  @IsEmail({}, { message: 'El email no es válido.' })
  @Transform(({ value }: { value: unknown }): unknown =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  email!: string;

  @IsString()
  @MinLength(1, { message: 'Ingresá tu contraseña.' })
  password!: string;
}
