import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';

/**
 * Protege el endpoint de ingesta. n8n tiene que mandar el header
 * `x-api-key` con el valor de la env `INGEST_API_KEY`.
 *
 * Si `INGEST_API_KEY` no está seteada, el guard deja pasar todo y avisa
 * por log (pensado para desarrollo local).
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const expected = process.env.INGEST_API_KEY?.trim();

    if (!expected) {
      this.logger.warn(
        'INGEST_API_KEY no está configurada: el endpoint de ingesta está abierto.',
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
