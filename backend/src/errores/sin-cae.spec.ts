/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import {
  ArgumentMetadata,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { SyncController } from './sync.controller';
import { SyncCaeComprobanteDto } from './dto/sync-cae.dto';
import { claseCae } from './errores.mapper';
import { ErroresRepository } from './errores.repository';
import { ErroresService } from './errores.service';
import { SyncCaePipe } from './pipes/sync-cae.pipe';

/** Lo justo de Prisma que usan los where de sin CAE. */
function cumple(t: any, where: any): boolean {
  return Object.entries(where ?? {}).every(([campo, valor]: [string, any]) =>
    valor && typeof valor === 'object' && 'in' in valor
      ? (valor.in as unknown[]).includes(t[campo])
      : t[campo] === valor,
  );
}

class FakeRepo {
  transacciones: any[] = [];
  eventos: any[] = [];
  metricas: any[] = [];

  empresas = new Map<string, string>([['IFLOW', 'I FLOW S.A.']]);

  transaction = (fn: (tx: unknown) => Promise<unknown>) => fn(this);

  asegurarEmpresa = (codigo: string, nombre: string | null) => {
    if (nombre || !this.empresas.has(codigo)) {
      this.empresas.set(codigo, nombre ?? codigo);
    }
    return Promise.resolve(null);
  };

  marcarSinCaeNoPresentes = (codigos: string[]) => {
    for (const t of this.transacciones) {
      if (codigos.includes(t.empresaCodigo)) t.presenteEnUltimaSync = false;
    }
    return Promise.resolve({ count: 0 });
  };

  buscarSinCae = (empresaCodigo: string, identi: string) =>
    Promise.resolve(
      this.transacciones.find(
        (t) => t.empresaCodigo === empresaCodigo && t.identi === identi,
      ) ?? null,
    );

  crearTransaccion = (data: any) => {
    const row = {
      id: `t${this.transacciones.length + 1}`,
      estadoApp: 'ERROR',
      responsableId: null,
      fechaResolucion: null,
      origenCierre: null,
      nroCae: null,
      ...data,
      empresaCodigo: data.empresa.connect.codigo,
    };
    delete row.empresa;
    this.transacciones.push(row);
    return Promise.resolve(row);
  };

  actualizarTransaccion = (id: string, data: any) => {
    const row = this.transacciones.find((t) => t.id === id);
    Object.assign(row, data);
    return Promise.resolve(row);
  };

  crearEvento = (data: any) => {
    this.eventos.push(data);
    return Promise.resolve(data);
  };

  crearMetrica = (data: any) => {
    this.metricas.push(data);
    return Promise.resolve(data);
  };

  listarSinCae = (where: any) =>
    Promise.resolve(this.transacciones.filter((t) => cumple(t, where)));

  contarSinCae = (where: any) =>
    Promise.resolve(this.transacciones.filter((t) => cumple(t, where)).length);

  obtenerBasico = (id: string) =>
    Promise.resolve(this.transacciones.find((t) => t.id === id) ?? null);
}

const comprobante = (
  over: Partial<SyncCaeComprobanteDto> = {},
): SyncCaeComprobanteDto => ({
  empresa: 'FLETCO',
  empresaNombre: 'Fletcorp',
  codfor: 'FA0004',
  nrofor: '8133',
  nroCae: null,
  fechaComprobante: '2026-08-21',
  fechaAlta: '2026-10-23 11:35:07.000',
  usuario: 'ADMIN',
  ultimoEnvio: null,
  mensajeArca: null,
  ultimoAutorizadoNro: '8132',
  ultimoAutorizadoFecha: '2026-10-22',
  ...over,
});

describe('claseCae', () => {
  it.each([
    ['FCEA16', 'FCE'],
    ['NCEA02', 'FCE'],
    ['FCEB10', 'FCE'],
    ['FE0019', 'EXPORTACION'],
    ['NCEE19', 'EXPORTACION'],
    ['FA0004', 'LOCAL'],
    ['FAC009', 'LOCAL'],
    ['CA0011', 'LOCAL'],
  ])('%s es %s', (codfor, clase) => {
    expect(claseCae(codfor)).toBe(clase);
  });
});

describe('ErroresService — sin CAE', () => {
  let service: ErroresService;
  let repo: FakeRepo;

  beforeEach(async () => {
    repo = new FakeRepo();
    const moduleRef = await Test.createTestingModule({
      providers: [
        ErroresService,
        { provide: ErroresRepository, useValue: repo },
      ],
    }).compile();
    service = moduleRef.get(ErroresService);
  });

  it('da de alta un comprobante sin CAE con su clase y su diagnóstico', async () => {
    const res = await service.syncCae([comprobante()]);

    expect(res.creados).toBe(1);
    expect(repo.transacciones[0]).toMatchObject({
      tipo: 'SIN_CAE',
      identi: 'FA0004 8133',
      modulo: 'FACTURACION',
      claseCae: 'LOCAL',
      statusSoftland: 'SIN_CAE',
      usuarioAltaSoftland: 'ADMIN',
      ultimoAutorizadoNro: '8132',
    });
    const { items } = await service.sinCae();
    expect(items[0].sinCae).toMatchObject({
      codfor: 'FA0004',
      nrofor: '8133',
      trabaPv: true,
      diagnosticos: ['TRABA_PV', 'FECHA_ANTERIOR', 'SIN_DATOS_ENVIO'],
    });
    expect(repo.metricas).toHaveLength(0);
  });

  it('sin empresaNombre no le cambia el nombre a una empresa que ya existe', async () => {
    await service.syncCae([
      comprobante({ empresa: 'IFLOW', empresaNombre: null }),
    ]);

    expect(repo.empresas.get('IFLOW')).toBe('I FLOW S.A.');
  });

  it('reenviarlo no lo duplica ni pisa el responsable', async () => {
    await service.syncCae([comprobante()]);
    repo.transacciones[0].responsableId = 'u1';
    repo.transacciones[0].estadoApp = 'ASIGNADO';

    const res = await service.syncCae([comprobante()]);

    expect(res).toMatchObject({ creados: 0, actualizados: 1 });
    expect(repo.transacciones).toHaveLength(1);
    expect(repo.transacciones[0]).toMatchObject({
      responsableId: 'u1',
      estadoApp: 'ASIGNADO',
    });
  });

  it('cuando llega con CAE se cierra solo', async () => {
    await service.syncCae([comprobante()]);

    const res = await service.syncCae([
      comprobante({ nroCae: '86438968563735' }),
    ]);

    expect(res.cerrados).toBe(1);
    expect(repo.transacciones[0]).toMatchObject({
      estadoApp: 'RESUELTO',
      origenCierre: 'VERIFICACION_AUTOMATICA',
      nroCae: '86438968563735',
      statusSoftland: 'CAE',
    });
    expect(repo.eventos.at(-1)).toMatchObject({ titulo: 'Obtuvo CAE' });
  });

  it('uno que ya tiene CAE y nunca estuvo sin CAE no se da de alta', async () => {
    const res = await service.syncCae([comprobante({ nroCae: '8640' })]);

    expect(res).toMatchObject({ creados: 0, ignorados: 1 });
    expect(repo.transacciones).toHaveLength(0);
  });

  it('en la foto completa, el que no vino queda abierto como "ya no figura"', async () => {
    await service.syncCae([comprobante()], ['FLETCO']);

    const res = await service.syncCae([], ['FLETCO']);

    expect(res.yaNoFiguran).toBe(1);
    expect(repo.transacciones[0].estadoApp).toBe('ERROR');
    const { items } = await service.sinCae();
    expect(items[0].sinCae!.diagnosticos).toContain('YA_NO_FIGURA');
  });

  it('una llamada parcial no marca nada como "ya no figura"', async () => {
    await service.syncCae([comprobante()]);

    await service.syncCae([comprobante({ nrofor: '8134' })], [], {
      parcial: true,
    });

    expect(repo.transacciones[0].presenteEnUltimaSync).toBe(true);
  });

  it('una FCE sin envío dice "no se envió" y con mensaje, "ARCA lo rechazó"', async () => {
    await service.syncCae([
      comprobante({ codfor: 'FCEA16', nrofor: '10', ultimoAutorizadoNro: '5' }),
      comprobante({
        codfor: 'FCEA16',
        nrofor: '11',
        ultimoAutorizadoNro: '5',
        ultimoEnvio: '2026-10-20 09:40:04.720',
        mensajeArca: 'Tag Auth no fue ingresado.',
      }),
    ]);

    const { items } = await service.sinCae();
    const de = (nrofor: string) =>
      items.find((i) => i.sinCae!.nrofor === nrofor)!.sinCae!.diagnosticos;
    expect(de('10')).toContain('NO_ENVIADO');
    expect(de('11')).toContain('RECHAZO_ARCA');
  });

  it('ordena primero los que traban un PV y cuenta los indicadores', async () => {
    await service.syncCae([
      comprobante({ nrofor: '9000', ultimoAutorizadoNro: '8132' }),
      comprobante({ nrofor: '8133' }),
    ]);

    const { items, indicadores } = await service.sinCae();

    expect(items.map((i) => i.codigo)).toEqual(['FA0004 8133', 'FA0004 9000']);
    expect(indicadores).toMatchObject({ total: 2, trabanPv: 1, sinAsignar: 2 });
  });

  it('un sin CAE no se puede mandar a reprocesar', async () => {
    await service.syncCae([comprobante()]);

    await expect(service.solicitarReproceso('t1', {})).rejects.toThrow(
      /sin CAE/i,
    );
  });
});

/**
 * Regresión: con la clase del DTO como tipo del parámetro, el ValidationPipe
 * global (el de main.ts) validaba el body crudo antes que SyncCaePipe y
 * rechazaba un comprobante suelto con 400.
 */
describe('POST /errores/sync-cae', () => {
  let app: INestApplication<App>;
  const service = {
    syncCae: jest.fn().mockResolvedValue({ recibidos: 1 }),
  };

  beforeAll(async () => {
    process.env.INGEST_API_KEY = 'clave-de-prueba';
    const moduleRef = await Test.createTestingModule({
      controllers: [SyncController],
      providers: [{ provide: ErroresService, useValue: service }],
    }).compile();
    app = moduleRef.createNestApplication();
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

  beforeEach(() => service.syncCae.mockClear());

  it('acepta un comprobante suelto como llamada parcial', async () => {
    const res = await request(app.getHttpServer())
      .post('/errores/sync-cae')
      .set('x-api-key', 'clave-de-prueba')
      .send({ Empresa: 'IFLOW', CodFor: 'FCEA16', NroFor: 4149 });

    expect(res.status).toBe(200);
    expect(service.syncCae).toHaveBeenCalledWith(
      [expect.objectContaining({ codfor: 'FCEA16', nrofor: '4149' })],
      [],
      { parcial: true },
    );
  });

  it('acepta la foto completa', async () => {
    const res = await request(app.getHttpServer())
      .post('/errores/sync-cae')
      .set('x-api-key', 'clave-de-prueba')
      .send({ empresasConsultadas: ['IFLOW'], comprobantes: [] });

    expect(res.status).toBe(200);
    expect(service.syncCae).toHaveBeenCalledWith([], ['IFLOW'], {
      parcial: false,
    });
  });

  it('sin x-api-key no llega al service', async () => {
    const res = await request(app.getHttpServer())
      .post('/errores/sync-cae')
      .send({ empresa: 'IFLOW', codfor: 'FCEA16', nrofor: 1 });

    expect(res.status).toBe(401);
    expect(service.syncCae).not.toHaveBeenCalled();
  });
});

describe('SyncCaePipe', () => {
  const pipe = new SyncCaePipe();
  const meta: ArgumentMetadata = { type: 'body' };

  it('un comprobante solo es una llamada parcial, sin importar mayúsculas', async () => {
    const res = await pipe.transform(
      { Empresa: 'IFLOW', CODFOR: 'FCEA16', NroFor: 4149, NroCae: '' },
      meta,
    );

    expect(res.parcial).toBe(true);
    expect(res.comprobantes[0]).toMatchObject({
      empresa: 'IFLOW',
      codfor: 'FCEA16',
      nrofor: '4149',
      nroCae: null,
    });
  });

  it('con empresasConsultadas y comprobantes es la foto completa', async () => {
    const res = await pipe.transform(
      {
        empresasConsultadas: ['IFLOW', 'FLETCO'],
        comprobantes: [{ empresa: 'FLETCO', codfor: 'FA0004', nrofor: '8133' }],
      },
      meta,
    );

    expect(res.parcial).toBe(false);
    expect(res.empresasConsultadas).toEqual(['IFLOW', 'FLETCO']);
  });

  it('acepta el JSON armado por FOR JSON como texto, solo o dentro de un campo', async () => {
    const json = JSON.stringify({
      empresasConsultadas: ['IFLOW'],
      comprobantes: [{ empresa: 'IFLOW', codfor: 'FE0019', nrofor: 31 }],
    });

    for (const body of [json, { body: json }]) {
      const res = await pipe.transform(body, meta);
      expect(res.parcial).toBe(false);
      expect(res.comprobantes[0]).toMatchObject({
        codfor: 'FE0019',
        nrofor: '31',
      });
    }
  });

  it('un texto que no es JSON se rechaza con un mensaje claro', async () => {
    await expect(pipe.transform({ body: '{roto' }, meta)).rejects.toThrow(
      /no es un JSON válido/,
    );
  });

  it('rechaza un comprobante sin código', async () => {
    await expect(
      pipe.transform({ empresa: 'IFLOW', nrofor: 1 }, meta),
    ).rejects.toThrow();
  });
});
