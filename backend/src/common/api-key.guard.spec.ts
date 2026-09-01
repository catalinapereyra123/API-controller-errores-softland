import {
  ExecutionContext,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiKeyGuard } from './api-key.guard';

const contextConHeader = (apiKey?: string): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({
        header: (nombre: string) =>
          nombre === 'x-api-key' ? apiKey : undefined,
      }),
    }),
  }) as ExecutionContext;

describe('ApiKeyGuard', () => {
  const nodeEnvOriginal = process.env.NODE_ENV;
  const apiKeyOriginal = process.env.INGEST_API_KEY;

  afterEach(() => {
    if (nodeEnvOriginal === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = nodeEnvOriginal;

    if (apiKeyOriginal === undefined) delete process.env.INGEST_API_KEY;
    else process.env.INGEST_API_KEY = apiKeyOriginal;
  });

  it('permite desarrollo local sin API key configurada', () => {
    process.env.NODE_ENV = 'test';
    delete process.env.INGEST_API_KEY;

    expect(new ApiKeyGuard().canActivate(contextConHeader())).toBe(true);
  });

  it('falla cerrado en producción si falta la configuración', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.INGEST_API_KEY;

    expect(() => new ApiKeyGuard().canActivate(contextConHeader())).toThrow(
      ServiceUnavailableException,
    );
  });

  it('rechaza una clave incorrecta', () => {
    process.env.INGEST_API_KEY = 'secreto';

    expect(() =>
      new ApiKeyGuard().canActivate(contextConHeader('otra-clave')),
    ).toThrow(UnauthorizedException);
  });

  it('acepta la clave configurada', () => {
    process.env.INGEST_API_KEY = 'secreto';

    expect(new ApiKeyGuard().canActivate(contextConHeader('secreto'))).toBe(
      true,
    );
  });
});
