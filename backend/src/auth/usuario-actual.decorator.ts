import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UsuarioAutenticado } from './dto/sesion.dto';
import type { RequestAutenticado } from './jwt-auth.guard';

/**
 * Inyecta el usuario del JWT en el handler.
 * `@UsuarioActual() usuario: UsuarioAutenticado` o `@UsuarioActual('id') id: string`.
 * Sólo tiene sentido en rutas protegidas con `JwtAuthGuard`.
 */
export const UsuarioActual = createParamDecorator(
  (campo: keyof UsuarioAutenticado | undefined, context: ExecutionContext) => {
    const { usuario } = context.switchToHttp().getRequest<RequestAutenticado>();
    return campo ? usuario?.[campo] : usuario;
  },
);
