import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';

/**
 * Protege el endpoint de ingesta. n8n tiene que mandar el header
 * `x-api-key` con el valor de la env `INGEST_API_KEY`.
 *
 * En desarrollo local puede quedar sin configurar. En producción falla
 * cerrado para no exponer accidentalmente los endpoints de integración.
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const expected = process.env.INGEST_API_KEY?.trim();

    if (!expected) {
      if (process.env.NODE_ENV === 'production') {
        throw new ServiceUnavailableException(
          'El endpoint de integración no está configurado.',
        );
      }

      this.logger.warn(
        'INGEST_API_KEY no está configurada: acceso abierto solo para desarrollo.',
      );
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const received =
      request.header('x-api-key') ??
      request.header('authorization')?.replace(/^Bearer\s+/i, '');

    if (received !== expected) {
      throw new UnauthorizedException('API key inválida o ausente.');
    }

    return true;
  }
}
