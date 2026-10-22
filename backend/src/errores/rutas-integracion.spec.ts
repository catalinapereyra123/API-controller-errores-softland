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
    resultadoPendiente: jest.fn().mockResolvedValue({
      hayPendiente: true,
      id: 'clx2',
      empresa: 'NORFLOW',
      modulo: 'COMPRAS',
      moduloOrigen: '3. Compras',
      identi: 'LIQ30289',
      solicitadoEn: '2026-10-14T13:48:59.222Z',
      notificado: true,
      intentos: 1,
    }),
    reprocesoPendiente: jest.fn().mockResolvedValue({
      hayPendiente: true,
      id: 'clx1',
      empresa: 'NORFLOW',
      modulo: 'COMPRAS',
      moduloOrigen: '3. Compras',
      identi: 'LIQ29054',
      solicitadoEn: '2026-09-09T14:20:00.000Z',
      notificado: false,
      intentos: 1,
    }),
    verificacionPendientes: jest.fn().mockResolvedValue([
      {
        id: 'clx9',
        empresa: 'PAE',
        modulo: 'FACTURACION',
        moduloOrigen: '1. Facturacion',
        identi: 'F2H5077',
        statusConocido: 'E',
        ultimaVerificacion: null,
      },
    ]),
    registrarVerificacion: jest.fn().mockResolvedValue({
      ok: true,
      estadoApp: 'RESUELTO',
      statusSoftland: 'S',
      cerrado: true,
      reabierto: false,
      mensaje: 'Resuelto en Softland: se cerró por verificación automática.',
    }),
    detalle: jest.fn().mockResolvedValue({ id: 'abc123' }),
    resumenEmpresa: jest.fn().mockResolvedValue({
      codigo: 'IFLOW2',
      nombre: 'I FLOW S.A.2',
      errores: 31,
    }),
    borrarEmpresa: jest.fn().mockResolvedValue({
      codigo: 'IFLOW2',
      nombre: 'I FLOW S.A.2',
      erroresBorrados: 31,
    }),
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

  it('el resultado pendiente del flujo 4 es un objeto plano, con x-api-key', async () => {
    const res = await request(app.getHttpServer())
      .get('/errores/integracion/resultado-pendiente')
      .set('x-api-key', 'clave-de-prueba');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(false);
    expect(res.body).toMatchObject({ hayPendiente: true, identi: 'LIQ30289' });
    expect(service.resultadoPendiente).toHaveBeenCalled();
  });

  it('el singular devuelve un objeto plano, mapeable campo por campo', async () => {
    const res = await request(app.getHttpServer())
      .get('/errores/integracion/reproceso-pendiente')
      .set('x-api-key', 'clave-de-prueba');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      hayPendiente: true,
      id: 'clx1',
      empresa: 'NORFLOW',
      modulo: 'COMPRAS',
      moduloOrigen: '3. Compras',
      identi: 'LIQ29054',
      solicitadoEn: '2026-09-09T14:20:00.000Z',
      notificado: false,
      intentos: 1,
    });
  });

  it('sin pendientes responde JSON con hayPendiente false, no un 200 vacío', async () => {
    const sinPendiente = {
      hayPendiente: false,
      id: null,
      empresa: null,
      modulo: null,
      moduloOrigen: null,
      identi: null,
      solicitadoEn: null,
      notificado: null,
      intentos: null,
    };
    service.reprocesoPendiente.mockResolvedValueOnce(sinPendiente);

    const res = await request(app.getHttpServer())
      .get('/errores/integracion/reproceso-pendiente')
      .set('x-api-key', 'clave-de-prueba');

    expect(res.status).toBe(200);
    expect(res.type).toBe('application/json');
    expect(res.body).toEqual(sinPendiente);
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
  it('la lista a verificar entra con x-api-key y sin JWT', async () => {
    const res = await request(app.getHttpServer())
      .get('/errores/integracion/verificacion-pendientes')
      .set('x-api-key', 'clave-de-prueba');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      {
        id: 'clx9',
        empresa: 'PAE',
        modulo: 'FACTURACION',
        moduloOrigen: '1. Facturacion',
        identi: 'F2H5077',
        statusConocido: 'E',
        ultimaVerificacion: null,
      },
    ]);
  });

  it('?limite llega como número al service', async () => {
    await request(app.getHttpServer())
      .get('/errores/integracion/verificacion-pendientes?limite=200')
      .set('x-api-key', 'clave-de-prueba');

    expect(service.verificacionPendientes).toHaveBeenCalledWith(200);
  });

  it('sin ?limite no se inventa un tope', async () => {
    await request(app.getHttpServer())
      .get('/errores/integracion/verificacion-pendientes')
      .set('x-api-key', 'clave-de-prueba');

    expect(service.verificacionPendientes).toHaveBeenCalledWith(undefined);
  });

  it('el POST de verificación también va por x-api-key', async () => {
    const res = await request(app.getHttpServer())
      .post('/errores/verificacion')
      .set('x-api-key', 'clave-de-prueba')
      .send({
        empresa: 'PAE',
        modulo: '1. Facturacion',
        identi: 'F2H5077',
        statusSoftland: 'S',
      });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ok: true, cerrado: true });
  });

  it('la verificación sin x-api-key corta en el ApiKeyGuard', async () => {
    const res = await request(app.getHttpServer())
      .post('/errores/verificacion')
      .send({ empresa: 'PAE', modulo: '1. Facturacion', identi: 'F2H5077' });

    expect(res.status).toBe(401);
    const body = res.body as { message?: string };
    expect(String(body.message)).toMatch(/API key/i);
  });

  it('el resumen de una empresa entra con x-api-key', async () => {
    const res = await request(app.getHttpServer())
      .get('/errores/integracion/empresas/IFLOW2')
      .set('x-api-key', 'clave-de-prueba');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      codigo: 'IFLOW2',
      nombre: 'I FLOW S.A.2',
      errores: 31,
    });
    expect(service.resumenEmpresa).toHaveBeenCalledWith('IFLOW2');
  });

  it('el DELETE de una empresa entra con x-api-key', async () => {
    const res = await request(app.getHttpServer())
      .delete('/errores/integracion/empresas/IFLOW2')
      .set('x-api-key', 'clave-de-prueba');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ erroresBorrados: 31 });
    expect(service.borrarEmpresa).toHaveBeenCalledWith('IFLOW2');
  });

  it('el DELETE de una empresa sin x-api-key no borra nada', async () => {
    service.borrarEmpresa.mockClear();

    const res = await request(app.getHttpServer()).delete(
      '/errores/integracion/empresas/IFLOW2',
    );

    expect(res.status).toBe(401);
    expect(service.borrarEmpresa).not.toHaveBeenCalled();
  });
});
