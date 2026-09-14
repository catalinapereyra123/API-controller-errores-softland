import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { ErroresService } from './errores.service';
import { SyncController } from './sync.controller';

/**
 * Contrato de POST /errores/verificacion con el MISMO ValidationPipe que
 * monta main.ts. Lo que manda el integrador no siempre es prolijo: cuando la
 * consulta a Softland no devuelve filas, el nodo suele mapear el campo como
 * string vacío o directamente no mandarlo. Eso tiene que llegar al service
 * como `null` (= "no figura"), no como un 400 ni como un status falso.
 */
describe('POST /errores/verificacion — contrato con el integrador', () => {
  let app: INestApplication<App>;
  /** DTOs ya validados y transformados que le llegaron al service. */
  const recibidos: Record<string, unknown>[] = [];
  const service = {
    registrarVerificacion: jest.fn((dto: Record<string, unknown>) => {
      recibidos.push(dto);
      return Promise.resolve({ ok: true });
    }),
  };
  const dtoRecibido = () => recibidos[0];

  const enviar = (body: unknown) =>
    request(app.getHttpServer())
      .post('/errores/verificacion')
      .set('x-api-key', 'clave-de-prueba')
      .send(body as object);

  const base = {
    empresa: 'PAE',
    modulo: '1. Facturacion',
    identi: 'F2H5077',
  };

  beforeAll(async () => {
    process.env.INGEST_API_KEY = 'clave-de-prueba';
    const moduleRef = await Test.createTestingModule({
      controllers: [SyncController],
      providers: [{ provide: ErroresService, useValue: service }],
    }).compile();

    app = moduleRef.createNestApplication();
    // Idéntico a main.ts.
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    delete process.env.INGEST_API_KEY;
  });

  beforeEach(() => {
    service.registrarVerificacion.mockClear();
    recibidos.length = 0;
  });

  it('normaliza el status a mayúsculas y recorta espacios', async () => {
    const res = await enviar({ ...base, statusSoftland: ' s ' });

    expect(res.status).toBe(200);
    expect(service.registrarVerificacion).toHaveBeenCalledWith(
      expect.objectContaining({ statusSoftland: 'S', identi: 'F2H5077' }),
    );
  });

  it('status vacío => null (la consulta no devolvió filas), no un 400', async () => {
    const res = await enviar({ ...base, statusSoftland: '' });

    expect(res.status).toBe(200);
    expect(service.registrarVerificacion).toHaveBeenCalledWith(
      expect.objectContaining({ statusSoftland: null }),
    );
  });

  it('status ausente => null', async () => {
    const res = await enviar(base);

    expect(res.status).toBe(200);
    expect(dtoRecibido().statusSoftland ?? null).toBeNull();
  });

  it('status null explícito => null', async () => {
    const res = await enviar({ ...base, statusSoftland: null });

    expect(res.status).toBe(200);
    expect(service.registrarVerificacion).toHaveBeenCalledWith(
      expect.objectContaining({ statusSoftland: null }),
    );
  });

  it('descarta los campos de más en vez de rechazar el body', async () => {
    const res = await enviar({
      ...base,
      statusSoftland: 'S',
      SAR_FCRMVH_STATUS: 'S',
      loQueSea: 123,
    });

    expect(res.status).toBe(200);
    expect(dtoRecibido()).not.toHaveProperty('SAR_FCRMVH_STATUS');
    expect(dtoRecibido()).not.toHaveProperty('loQueSea');
  });

  it('sin identi es 400: sin clave no se puede verificar nada', async () => {
    const res = await enviar({ empresa: 'PAE', modulo: '1. Facturacion' });

    expect(res.status).toBe(400);
    expect(service.registrarVerificacion).not.toHaveBeenCalled();
  });
});
