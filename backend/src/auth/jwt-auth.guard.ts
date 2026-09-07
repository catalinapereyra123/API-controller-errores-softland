import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { UsuarioAutenticado } from './dto/sesion.dto';

interface PayloadJwt {
  sub: string;
  email: string;
  nombre: string;
}

/** Request con el usuario que el guard dejó tras validar el token. */
export interface RequestAutenticado extends Request {
  usuario: UsuarioAutenticado;
}

/**
 * Exige `Authorization: Bearer <token>` y deja el usuario en `request.usuario`.
 * Se usa en los endpoints que consume el front (los de n8n van con x-api-key).
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestAutenticado>();
    const token = extraerToken(request);
    if (!token) throw new UnauthorizedException('Falta el token de sesión.');

    try {
      const payload = await this.jwt.verifyAsync<PayloadJwt>(token);
      request.usuario = {
        id: payload.sub,
        email: payload.email,
        nombre: payload.nombre,
      };
      return true;
    } catch {
      throw new UnauthorizedException(
        'La sesión expiró o el token no es válido.',
      );
    }
  }
}

function extraerToken(request: Request): string | null {
  const [esquema, token] = request.headers.authorization?.split(' ') ?? [];
  return esquema === 'Bearer' && token ? token : null;
}
