import { Global, Logger, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService, TOKEN_EXPIRA_EN_SEGUNDOS } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PasswordService } from './password.service';

const SECRET_DE_DESARROLLO = 'dev-secret-cambiar-en-produccion';

/**
 * En producción el secreto es obligatorio: sin él cualquiera podría firmar
 * tokens válidos. En desarrollo se usa uno fijo para no trabar el arranque.
 */
function resolverSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();
  if (secret) return secret;

  if (process.env.NODE_ENV === 'production') {
    throw new Error('Falta JWT_SECRET: es obligatorio en producción.');
  }
  new Logger('AuthModule').warn(
    'JWT_SECRET no está configurada: se usa un secreto de desarrollo.',
  );
  return SECRET_DE_DESARROLLO;
}

/** Global para que cualquier módulo use `JwtAuthGuard` sin reimportar JwtModule. */
@Global()
@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: resolverSecret(),
      signOptions: { expiresIn: TOKEN_EXPIRA_EN_SEGUNDOS },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, PasswordService, JwtAuthGuard],
  exports: [AuthService, JwtAuthGuard],
})
export class AuthModule {}
