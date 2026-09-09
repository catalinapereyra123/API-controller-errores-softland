import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { ErroresController } from './errores.controller';
import { ErroresService } from './errores.service';
import { SyncController } from './sync.controller';

/**
 * Regresión: la ruta del integrador vivía en `GET /errores/reproceso-pendientes`
 * y la capturaba el `GET /errores/:id` de ErroresController (que pide JWT),
 * porque ese controller se registra primero en ErroresModule. El integrador
 * recibía 401 "Falta el token de sesión." aunque mandara la x-api-key.
 * El segmento `integracion/` la hace inconfundible.
 */
describe('Rutas del integrador vs. /errores/:id', () => {
  let app: INestApplication<App>;
  const service = {
    reprocesoPendientes: jest.fn().mockResolvedValue([]),
    detalle: jest.fn().mockResolvedValue({ id: 'abc123' }),
  };

  beforeAll(async () => {
    process.env.INGEST_API_KEY = 'clave-de-prueba';
    const moduleRef = await Test.createTestingModule({
      // Mismo orden que ErroresModule: ErroresController primero.
      controllers: [ErroresController, SyncController],
      providers: [
        { provide: ErroresService, useValue: service },
        { provide: JwtService, useValue: { verifyAsync: jest.fn() } },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    delete process.env.INGEST_API_KEY;
  });

  it('el integrador entra con x-api-key y sin JWT', async () => {
    const res = await request(app.getHttpServer())
      .get('/errores/integracion/reproceso-pendientes')
      .set('x-api-key', 'clave-de-prueba');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
    expect(service.reprocesoPendientes).toHaveBeenCalled();
  });

  it('sin x-api-key corta el ApiKeyGuard, no el de sesión', async () => {
    const res = await request(app.getHttpServer()).get(
      '/errores/integracion/reproceso-pendientes',
    );

    expect(res.status).toBe(401);
    const body = res.body as { message?: string };
    expect(String(body.message)).toMatch(/API key/i);
  });

  it('la ruta vieja, sin integracion/, la sigue capturando /errores/:id', async () => {
    const res = await request(app.getHttpServer())
      .get('/errores/reproceso-pendientes')
      .set('x-api-key', 'clave-de-prueba');

    // Esto es exactamente lo que devolvía Postman antes del cambio.
    const body = res.body as { message?: string };
    expect(res.status).toBe(401);
    expect(body.message).toBe('Falta el token de sesión.');
  });

  it('/errores/:id sigue pidiendo JWT', async () => {
    const res = await request(app.getHttpServer()).get('/errores/abc123');

    expect(res.status).toBe(401);
    const body = res.body as { message?: string };
    expect(body.message).toBe('Falta el token de sesión.');
  });
});
