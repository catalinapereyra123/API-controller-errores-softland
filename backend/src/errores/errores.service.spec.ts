/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Test } from '@nestjs/testing';
import { SyncErrorDto } from './dto/sync-error.dto';
import { ErroresRepository } from './errores.repository';
import { ErroresService } from './errores.service';

/**
 * Repo falso en memoria: alcanza para probar la lógica del sync
 * (idempotencia, preservar workflow, conciliación de reproceso) sin base.
 */
class FakeRepo {
  empresas = new Map<string, { codigo: string; nombre: string }>();
  transacciones: any[] = [];
  eventos: any[] = [];
  intentos: any[] = [];
  metricas: any[] = [];

  transaction = (fn: (tx: unknown) => Promise<unknown>) => fn(this);

  upsertEmpresa = (codigo: string, nombre: string) => {
    this.empresas.set(codigo, { codigo, nombre });
    return Promise.resolve(this.empresas.get(codigo));
  };

  marcarNoPresentes = (codigos: string[]) => {
    for (const t of this.transacciones) {
      if (codigos.includes(t.empresaCodigo)) t.presenteEnUltimaSync = false;
    }
    return Promise.resolve({ count: 0 });
  };

  buscarPorOrigen = (empresaCodigo: string, modulo: string, identi: string) =>
    Promise.resolve(
      this.transacciones.find(
        (t) =>
          t.empresaCodigo === empresaCodigo &&
          t.modulo === modulo &&
          t.identi === identi,
      ) ?? null,
    );

  crearTransaccion = (data: any) => {
    const row = {
      id: `t${this.transacciones.length + 1}`,
      estadoApp: 'ERROR',
      intentos: 0,
      responsableId: null,
      corregidoPorId: null,
      corregidoPorNombre: null,
      fechaCorreccion: null,
      fechaResolucion: null,
      reprocesoNotificadoAt: null,
      reprocesoDesaparecioAt: null,
      origenCierre: null,
      ultimaVerificacionAt: null,
      resultadoSolicitadoAt: null,
      ...data,
      empresaCodigo: data.empresa.connect.codigo,
    };
    this.transacciones.push(row);
    return Promise.resolve(row);
  };

  actualizarTransaccion = (id: string, data: any) => {
    const row = this.transacciones.find((t) => t.id === id);
    for (const [k, v] of Object.entries(data)) {
      if (v && typeof v === 'object' && ('connect' in v || 'disconnect' in v)) {
        // relación: el fake sólo guarda la FK, como hace Prisma
        row[`${k}Id`] =
          'connect' in v ? (v as { connect: { id: string } }).connect.id : null;
        continue;
      }
      row[k] =
        v && typeof v === 'object' && 'increment' in v
          ? (row[k] ?? 0) + (v as { increment: number }).increment
          : v;
    }
    return Promise.resolve(row);
  };

  crearEvento = (data: any) => {
    this.eventos.push(data);
    return Promise.resolve(data);
  };

  crearObservacion = (data: any) => Promise.resolve(data);

  crearMetrica = (data: any) => {
    this.metricas.push(data);
    return Promise.resolve(data);
  };

  crearIntento = (data: any) => {
    const row = {
      id: `i${this.intentos.length + 1}`,
      cerradoAt: null,
      ...data,
    };
    this.intentos.push(row);
    return Promise.resolve(row);
  };

  /**
   * Igualdad campo por campo (o `{ not: null }`). Con orderBy sólo respeta
   * lo que usa resultadoPendiente: `resultadoSolicitadoAt` desc (nulls al
   * final) y después `ultimaVerificacionAt` asc (nulls primero).
   */
  primerPendiente = (where: any, orderBy?: any[]) => {
    const matchean = this.transacciones.filter((t) =>
      Object.entries(where).every(([campo, valor]: [string, any]) =>
        valor && typeof valor === 'object' && 'not' in valor
          ? t[campo] != valor.not
          : t[campo] === valor,
      ),
    );
    if (orderBy?.some((o) => 'ultimaVerificacionAt' in o)) {
      const ms = (t: { ultimaVerificacionAt?: Date | null }) =>
        t.ultimaVerificacionAt?.getTime() ?? -Infinity;
      matchean.sort((a, b) => ms(a) - ms(b));
    }
    if (orderBy?.some((o) => 'resultadoSolicitadoAt' in o)) {
      const ms = (t: { resultadoSolicitadoAt?: Date | null }) =>
        t.resultadoSolicitadoAt?.getTime() ?? -Infinity;
      // sort es estable: entre los no pedidos queda el orden anterior.
      matchean.sort((a, b) => ms(b) - ms(a));
    }
    return Promise.resolve(matchean[0] ?? null);
  };

  intentoAbierto = (errorId: string) =>
    Promise.resolve(
      [...this.intentos]
        .reverse()
        .find((i) => i.errorId === errorId && i.cerradoAt == null) ?? null,
    );

  cerrarIntento = (id: string, data: any) => {
    const row = this.intentos.find((i) => i.id === id);
    Object.assign(row, data);
    return Promise.resolve(row);
  };

  contarDesaparecidos = (codigos: string[]) =>
    Promise.resolve(
      this.transacciones.filter(
        (t) =>
          codigos.includes(t.empresaCodigo) &&
          !t.presenteEnUltimaSync &&
          !['REPROCESANDO', 'RESUELTO', 'DESCARTADO'].includes(t.estadoApp),
      ).length,
    );

  reprocesandoDesaparecidos = (codigos: string[]) =>
    Promise.resolve(
      this.transacciones.filter(
        (t) =>
          codigos.includes(t.empresaCodigo) &&
          t.estadoApp === 'REPROCESANDO' &&
          !t.presenteEnUltimaSync,
      ),
    );

  obtenerBasico = (id: string) =>
    Promise.resolve(this.transacciones.find((t) => t.id === id) ?? null);

  obtener = (id: string) =>
    Promise.resolve({
      ...this.transacciones.find((t) => t.id === id),
      observaciones: [],
      eventos: [],
      intentosReproceso: [],
    });

  listar = (where: any) =>
    Promise.resolve(
      this.transacciones.filter(
        (t) =>
          (where?.estadoApp ? t.estadoApp === where.estadoApp : true) &&
          (where?.reprocesoNotificadoAt?.not === null
            ? t.reprocesoNotificadoAt != null
            : true),
      ),
    );

  listarParaVerificar = (limite?: number) => {
    const abiertos = this.transacciones.filter((t) =>
      ['ERROR', 'ASIGNADO', 'EN_PROGRESO', 'REQUIERE_CORRECCION'].includes(
        t.estadoApp,
      ),
    );
    return Promise.resolve(limite ? abiertos.slice(0, limite) : abiertos);
  };

  buscarUsuario = () => Promise.resolve(null);

  buscarEmpresa = (codigo: string) =>
    Promise.resolve(this.empresas.get(codigo) ?? null);

  contar = (where: { empresaCodigo: string }) =>
    Promise.resolve(
      this.transacciones.filter((t) => t.empresaCodigo === where.empresaCodigo)
        .length,
    );

  borrarErroresDeEmpresa = (codigo: string) => {
    const antes = this.transacciones.length;
    this.transacciones = this.transacciones.filter(
      (t) => t.empresaCodigo !== codigo,
    );
    return Promise.resolve({ count: antes - this.transacciones.length });
  };

  borrarEmpresa = (codigo: string) => {
    this.empresas.delete(codigo);
    return Promise.resolve({ codigo });
  };
}

const registro = (over: Partial<SyncErrorDto> = {}): SyncErrorDto => ({
  empresa: 'AMCARG',
  empresaNombre: 'AM CARGAS S.A.',
  modulo: '3. Compras',
  identi: 'LIQ100',
  statusSoftland: 'E',
  error: 'El proveedor no existe',
  cuenta: '437',
  fecha: null,
  ...over,
});

describe('ErroresService.sync', () => {
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

  it('crea empresas y transacciones nuevas', async () => {
    const res = await service.sync([
      registro(),
      registro({
        identi: 'LIQ101',
        empresa: 'IFLOW',
        empresaNombre: 'I FLOW S.A.',
      }),
    ]);

    expect(res.creados).toBe(2);
    expect(res.empresas).toBe(2);
    expect(repo.transacciones).toHaveLength(2);
  });

  it('es idempotente: reenviar el mismo registro actualiza, no duplica', async () => {
    await service.sync([registro()]);
    const res = await service.sync([
      registro({ error: 'El proveedor no existe ' }),
    ]);

    expect(res.creados).toBe(0);
    expect(res.actualizados).toBe(1);
    expect(repo.transacciones).toHaveLength(1);
  });

  it('no pisa el estado de gestión al re-sincronizar', async () => {
    await service.sync([registro()]);
    repo.transacciones[0].estadoApp = 'ASIGNADO';
    repo.transacciones[0].responsableId = 'u1';

    await service.sync([registro()]);

    expect(repo.transacciones[0].estadoApp).toBe('ASIGNADO');
    expect(repo.transacciones[0].responsableId).toBe('u1');
  });

  it('reabre un error que estaba RESUELTO y vuelve a llegar', async () => {
    await service.sync([registro()]);
    repo.transacciones[0].estadoApp = 'RESUELTO';
    repo.transacciones[0].fechaResolucion = new Date();

    const res = await service.sync([registro()]);

    expect(res.reaparecidos).toBe(1);
    expect(repo.transacciones[0].estadoApp).toBe('ERROR');
    expect(repo.transacciones[0].fechaResolucion).toBeNull();
  });

  it('ignora registros con módulo desconocido y los reporta', async () => {
    const res = await service.sync([registro({ modulo: '9. Cartera' })]);

    expect(res.creados).toBe(0);
    expect(res.ignorados).toBe(1);
    expect(res.detalleIgnorados[0].identi).toBe('LIQ100');
  });

  it('marca como desaparecido lo que ya no llega desde Softland', async () => {
    await service.sync([registro(), registro({ identi: 'LIQ200' })]);
    const res = await service.sync([registro()]);

    expect(res.desaparecidos).toBe(1);
    expect(
      repo.transacciones.find((t) => t.identi === 'LIQ200')
        .presenteEnUltimaSync,
    ).toBe(false);
  });

  it('detecta una empresa sin errores cuando fue consultada', async () => {
    await service.sync([registro()]);

    const res = await service.sync([], ['AMCARG']);

    expect(res.empresas).toBe(1);
    expect(res.recibidos).toBe(0);
    expect(res.desaparecidos).toBe(1);
    expect(repo.transacciones[0].presenteEnUltimaSync).toBe(false);
  });

  it('REPROCESANDO + status S => RESUELTO', async () => {
    await service.sync([registro()]);
    repo.transacciones[0].estadoApp = 'REPROCESANDO';
    repo.intentos.push({ id: 'i1', errorId: 't1', cerradoAt: null });

    const res = await service.sync([
      registro({ statusSoftland: 'S', error: null }),
    ]);

    expect(res.reprocesadosOk).toBe(1);
    expect(repo.transacciones[0].estadoApp).toBe('RESUELTO');
    expect(repo.intentos[0].statusDespues).toBe('S');
  });

  it('REPROCESANDO + vuelve a E => REQUIERE_CORRECCION', async () => {
    await service.sync([registro()]);
    repo.transacciones[0].estadoApp = 'REPROCESANDO';

    const res = await service.sync([registro({ statusSoftland: 'E' })]);

    expect(res.regresiones).toBe(1);
    expect(repo.transacciones[0].estadoApp).toBe('REQUIERE_CORRECCION');
  });

  it('REPROCESANDO + el error desaparece del feed => alarma, NO se resuelve solo', async () => {
    await service.sync([registro(), registro({ identi: 'LIQ200' })]);
    const liq200 = repo.transacciones.find((t) => t.identi === 'LIQ200');
    liq200.estadoApp = 'REPROCESANDO';

    const res = await service.sync([registro()]);

    expect(res.reprocesadosOk).toBe(0);
    expect(res.reprocesandoSinConfirmar).toBe(1);
    expect(liq200.estadoApp).toBe('REPROCESANDO');
    expect(liq200.reprocesoDesaparecioAt).not.toBeNull();
  });

  describe('parcial (iFlow: un POST por error)', () => {
    it('no marca como desaparecido lo que no vino en esta llamada', async () => {
      await service.sync([registro(), registro({ identi: 'LIQ200' })]);
      const res = await service.sync([registro()], [], { parcial: true });

      expect(res.desaparecidos).toBe(0);
      expect(
        repo.transacciones.find((t) => t.identi === 'LIQ200')
          .presenteEnUltimaSync,
      ).toBe(true);
    });

    it('no dispara la alarma de reproceso desaparecido', async () => {
      await service.sync([registro(), registro({ identi: 'LIQ200' })]);
      const liq200 = repo.transacciones.find((t) => t.identi === 'LIQ200');
      liq200.estadoApp = 'REPROCESANDO';

      const res = await service.sync([registro()], [], { parcial: true });

      expect(res.reprocesandoSinConfirmar).toBe(0);
      expect(liq200.reprocesoDesaparecioAt).toBeNull();
    });

    it('igual crea y concilia el error que llega', async () => {
      await service.sync([registro()], [], { parcial: true });
      repo.transacciones[0].estadoApp = 'REPROCESANDO';

      const res = await service.sync(
        [registro({ statusSoftland: 'S', error: null })],
        [],
        { parcial: true },
      );

      expect(res.reprocesadosOk).toBe(1);
      expect(repo.transacciones[0].estadoApp).toBe('RESUELTO');
    });
  });
});

describe('ErroresService.solicitarReproceso', () => {
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
    delete process.env.N8N_REPROCESO_WEBHOOK_URL;
  });

  it('pasa a REPROCESANDO, suma intento y crea ErrorIntento', async () => {
    await service.sync([registro()]);

    const detalle = await service.solicitarReproceso('t1', {
      observacion: 'Corregí la lista de precios',
    });

    expect(repo.transacciones[0].estadoApp).toBe('REPROCESANDO');
    expect(repo.transacciones[0].intentos).toBe(1);
    expect(repo.transacciones[0].corregidoPorNombre).toBe('Sistema');
    expect(repo.intentos).toHaveLength(1);
    expect(repo.intentos[0].numeroIntento).toBe(1);
    expect(repo.intentos[0].usuarioNombre).toBe('Sistema');
    expect(detalle.reprocesoNotificado).toBe(false);
  });

  describe('con IFLOW_REPROCESO_EXECUTION_KEY', () => {
    let fetchMock: jest.SpyInstance;

    beforeEach(() => {
      process.env.N8N_REPROCESO_WEBHOOK_URL =
        'https://api-studio.iflow21.com/api/v1/spOrchestrator/execute';
      process.env.IFLOW_REPROCESO_EXECUTION_KEY = 'FSOF-0003-P6';
      process.env.IFLOW_API_TOKEN = 'token-iflow';
      process.env.INGEST_API_KEY = 'clave-propia';
      fetchMock = jest
        .spyOn(global, 'fetch')
        .mockResolvedValue(new Response('{}', { status: 200 }));
    });

    afterEach(() => {
      fetchMock.mockRestore();
      delete process.env.N8N_REPROCESO_WEBHOOK_URL;
      delete process.env.IFLOW_REPROCESO_EXECUTION_KEY;
      delete process.env.IFLOW_API_TOKEN;
      delete process.env.INGEST_API_KEY;
    });

    it('dispara el flujo de iFlow con el contrato de spOrchestrator', async () => {
      await service.sync([registro()]);

      const detalle = await service.solicitarReproceso('t1', {});

      expect(detalle.reprocesoNotificado).toBe(true);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe(
        'https://api-studio.iflow21.com/api/v1/spOrchestrator/execute',
      );
      expect(JSON.parse(init.body)).toEqual({
        executionKey: 'FSOF-0003-P6',
        parameters: { empresa: 'AMCARG', modulo: 'COMPRAS', identi: 'LIQ100' },
        isFile: false,
      });
      expect(init.headers['x-api-key']).toBeUndefined();
      expect(init.headers.authorization).toBe('Bearer token-iflow');
    });

    it('si iFlow responde error, queda sin notificar', async () => {
      fetchMock.mockResolvedValue(new Response('{}', { status: 400 }));
      await service.sync([registro()]);

      const detalle = await service.solicitarReproceso('t1', {});

      expect(detalle.reprocesoNotificado).toBe(false);
      expect(repo.transacciones[0].estadoApp).toBe('REPROCESANDO');
    });
  });

  it('reprocesoPendiente devuelve siempre un objeto, nunca null ni un array', async () => {
    await service.sync([registro()]);
    expect(await service.reprocesoPendiente()).toEqual({
      hayPendiente: false,
      id: null,
      empresa: null,
      modulo: null,
      moduloOrigen: null,
      identi: null,
      solicitadoEn: null,
      notificado: null,
      intentos: null,
    });

    await service.solicitarReproceso('t1', {});
    const pendiente = await service.reprocesoPendiente();

    expect(Array.isArray(pendiente)).toBe(false);
    expect(pendiente).toMatchObject({
      hayPendiente: true,
      empresa: 'AMCARG',
      modulo: 'COMPRAS',
      moduloOrigen: '3. Compras',
      identi: 'LIQ100',
      intentos: 1,
    });
  });

  it('resultadoPendiente trae de a uno los ya pasados a N y rota los que siguen en N', async () => {
    await service.sync([
      registro({ identi: 'LIQ100' }),
      registro({ identi: 'LIQ101' }),
      registro({ identi: 'LIQ102' }),
    ]);
    // Sin webhook configurado ninguno queda notificado.
    await service.solicitarReproceso('t1', {});
    await service.solicitarReproceso('t2', {});
    await service.solicitarReproceso('t3', {});
    expect(await service.resultadoPendiente()).toMatchObject({
      hayPendiente: false,
      identi: null,
    });

    // Cada informe un segundo después del anterior: la rotación depende de
    // ultimaVerificacionAt y dos en el mismo milisegundo empatarían.
    jest.useFakeTimers({ now: new Date('2026-10-14T12:00:00Z') });
    try {
      const informar = (identi: string, statusSoftland: string) => {
        jest.setSystemTime(Date.now() + 1000);
        return service.registrarResultadoReproceso({
          empresa: 'AMCARG',
          modulo: '3. Compras',
          identi,
          statusSoftland,
        });
      };
      // LIQ102 no se pasó a N: nunca sale, aunque esté en REPROCESANDO.
      await informar('LIQ100', 'N');
      await informar('LIQ101', 'N');

      const primero = await service.resultadoPendiente();
      expect(primero).toMatchObject({
        hayPendiente: true,
        identi: 'LIQ100',
        notificado: true,
      });

      // El que sigue en N va al final; el otro pasa adelante.
      await informar('LIQ100', 'N');
      expect((await service.resultadoPendiente()).identi).toBe('LIQ101');

      // Con S sale de la cola: queda sólo el otro.
      await informar('LIQ101', 'S');
      expect((await service.resultadoPendiente()).identi).toBe('LIQ100');
    } finally {
      jest.useRealTimers();
    }
  });

  it('reprocesoPendiente pasa al siguiente cuando el integrador informa N', async () => {
    await service.sync([
      registro({ identi: 'LIQ100' }),
      registro({ identi: 'LIQ101' }),
    ]);
    await service.solicitarReproceso('t1', {});
    await service.solicitarReproceso('t2', {});
    const informarN = (identi: string) =>
      service.registrarResultadoReproceso({
        empresa: 'AMCARG',
        modulo: '3. Compras',
        identi,
        statusSoftland: 'N',
      });

    expect((await service.reprocesoPendiente()).identi).toBe('LIQ100');

    await informarN('LIQ100');
    expect((await service.reprocesoPendiente()).identi).toBe('LIQ101');

    await informarN('LIQ101');
    expect((await service.reprocesoPendiente()).hayPendiente).toBe(false);

    // Siguen en curso: N no es un resultado.
    expect(repo.transacciones[0].estadoApp).toBe('REPROCESANDO');
    expect(repo.transacciones[1].estadoApp).toBe('REPROCESANDO');
  });

  it('cambiarEstado rechaza RESUELTO manual', async () => {
    await service.sync([registro()]);
    await expect(
      service.cambiarEstado('t1', { estado: 'RESUELTO' }),
    ).rejects.toThrow(/reproceso/i);
  });

  it('cambiarEstado permite EN_PROGRESO', async () => {
    await service.sync([registro()]);
    await service.cambiarEstado('t1', { estado: 'EN_PROGRESO' });
    expect(repo.transacciones[0].estadoApp).toBe('EN_PROGRESO');
  });
});

describe('ErroresService.consultarResultado', () => {
  let service: ErroresService;
  let repo: FakeRepo;
  let fetchMock: jest.SpyInstance;

  /** Error en REPROCESANDO que el flujo ya pasó a N. */
  async function reprocesandoEnN(identi = 'LIQ100') {
    await service.sync([registro({ identi })]);
    const t: {
      id: string;
      estadoApp: string;
      resultadoSolicitadoAt: Date | null;
    } = repo.transacciones.find((x) => x.identi === identi);
    await service.solicitarReproceso(t.id, {});
    await service.registrarResultadoReproceso({
      empresa: 'AMCARG',
      modulo: '3. Compras',
      identi,
      statusSoftland: 'N',
    });
    return t;
  }

  beforeEach(async () => {
    repo = new FakeRepo();
    const moduleRef = await Test.createTestingModule({
      providers: [
        ErroresService,
        { provide: ErroresRepository, useValue: repo },
      ],
    }).compile();
    service = moduleRef.get(ErroresService);
    delete process.env.N8N_REPROCESO_WEBHOOK_URL;
    process.env.IFLOW_RESULTADO_EXECUTION_KEY = 'FSOF-0004-P1';
    process.env.IFLOW_API_TOKEN = 'token-iflow';
    fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response('{}', { status: 200 }));
  });

  afterEach(() => {
    fetchMock.mockRestore();
    delete process.env.IFLOW_RESULTADO_EXECUTION_KEY;
    delete process.env.IFLOW_API_TOKEN;
  });

  it('dispara el nodo 1 del flujo de resultado en iFlow', async () => {
    const t = await reprocesandoEnN();

    await service.consultarResultado(t.id);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(
      'https://api-studio.iflow21.com/api/v1/spOrchestrator/execute',
    );
    expect(JSON.parse(init.body)).toEqual({
      executionKey: 'FSOF-0004-P1',
      parameters: { empresa: 'AMCARG', modulo: 'COMPRAS', identi: 'LIQ100' },
      isFile: false,
    });
    expect(init.headers.authorization).toBe('Bearer token-iflow');
  });

  it('el GET resultado-pendiente devuelve primero el que se pidió consultar', async () => {
    await reprocesandoEnN('LIQ100');
    const pedido = await reprocesandoEnN('LIQ101');
    // Sin pedido saldría LIQ100 (el que hace más que no se consulta).
    expect((await service.resultadoPendiente()).identi).toBe('LIQ100');

    await service.consultarResultado(pedido.id);
    expect((await service.resultadoPendiente()).identi).toBe('LIQ101');

    // Cuando llega su resultado deja de tener prioridad.
    await service.registrarResultadoReproceso({
      empresa: 'AMCARG',
      modulo: '3. Compras',
      identi: 'LIQ101',
      statusSoftland: 'N',
    });
    expect(pedido.resultadoSolicitadoAt).toBeNull();
    expect((await service.resultadoPendiente()).identi).toBe('LIQ100');
  });

  it('rechaza un error que no está reprocesando', async () => {
    await service.sync([registro()]);
    await expect(service.consultarResultado('t1')).rejects.toThrow(
      /reprocesando/i,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rechaza uno que todavía no se pasó a N', async () => {
    await service.sync([registro()]);
    await service.solicitarReproceso('t1', {});
    await expect(service.consultarResultado('t1')).rejects.toThrow(/a N/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('avisa si falta la executionKey', async () => {
    const t = await reprocesandoEnN();
    delete process.env.IFLOW_RESULTADO_EXECUTION_KEY;
    await expect(service.consultarResultado(t.id)).rejects.toThrow(
      /IFLOW_RESULTADO_EXECUTION_KEY/,
    );
  });

  it('si iFlow responde error, lo informa con el status', async () => {
    const t = await reprocesandoEnN();
    fetchMock.mockResolvedValue(new Response('{}', { status: 403 }));
    await expect(service.consultarResultado(t.id)).rejects.toThrow(/403/);
    expect(t.estadoApp).toBe('REPROCESANDO');
  });
});

describe('ErroresService.registrarResultadoReproceso', () => {
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

  it('status S => RESUELTO y cierra el intento', async () => {
    await service.sync([registro()]);
    repo.transacciones[0].estadoApp = 'REPROCESANDO';
    repo.intentos.push({ id: 'i1', errorId: 't1', cerradoAt: null });

    const res = await service.registrarResultadoReproceso({
      empresa: 'AMCARG',
      modulo: '3. Compras',
      identi: 'LIQ100',
      statusSoftland: 'S',
    });

    expect(res.estadoApp).toBe('RESUELTO');
    expect(repo.transacciones[0].estadoApp).toBe('RESUELTO');
    expect(repo.intentos[0].statusDespues).toBe('S');
  });

  it('status E => REQUIERE_CORRECCION con el nuevo mensaje', async () => {
    await service.sync([registro()]);
    repo.transacciones[0].estadoApp = 'REPROCESANDO';

    const res = await service.registrarResultadoReproceso({
      empresa: 'AMCARG',
      modulo: '3. Compras',
      identi: 'LIQ100',
      statusSoftland: 'E',
      error: 'Sigue mal la lista de precios',
    });

    expect(res.estadoApp).toBe('REQUIERE_CORRECCION');
    expect(repo.transacciones[0].errorMensaje).toBe(
      'Sigue mal la lista de precios',
    );
  });

  it('status N => sigue REPROCESANDO, registra que se pasó a N y no cierra el intento', async () => {
    await service.sync([registro()]);
    repo.transacciones[0].estadoApp = 'REPROCESANDO';
    repo.intentos.push({ id: 'i1', errorId: 't1', cerradoAt: null });

    const res = await service.registrarResultadoReproceso({
      empresa: 'AMCARG',
      modulo: '3. Compras',
      identi: 'LIQ100',
      statusSoftland: 'N',
    });

    expect(res.statusSoftland).toBe('N');
    expect(repo.transacciones[0].estadoApp).toBe('REPROCESANDO');
    expect(repo.transacciones[0].reprocesoNotificadoAt).toBeInstanceOf(Date);
    expect(repo.intentos[0].cerradoAt).toBeNull();
  });

  it('un segundo N no vuelve a registrar nada', async () => {
    await service.sync([registro()]);
    repo.transacciones[0].estadoApp = 'REPROCESANDO';
    const statusN = {
      empresa: 'AMCARG',
      modulo: '3. Compras',
      identi: 'LIQ100',
      statusSoftland: 'N',
    };

    await service.registrarResultadoReproceso(statusN);
    const primeraMarca = repo.transacciones[0].reprocesoNotificadoAt;
    const eventos = repo.eventos.length;

    const res = await service.registrarResultadoReproceso(statusN);

    expect(res.mensaje).toMatch(/sin cambios/);
    expect(repo.transacciones[0].reprocesoNotificadoAt).toBe(primeraMarca);
    expect(repo.eventos).toHaveLength(eventos);
  });

  it('N con error => falló el reproceso (E), aunque sea el primer N', async () => {
    await service.sync([registro()]);
    repo.transacciones[0].estadoApp = 'REPROCESANDO';
    repo.intentos.push({ id: 'i1', errorId: 't1', cerradoAt: null });

    const res = await service.registrarResultadoReproceso({
      empresa: 'AMCARG',
      modulo: '3. Compras',
      identi: 'LIQ100',
      statusSoftland: 'N',
      error:
        'Se ha producido un error, verificar el archivo c:\\padron\\CO_Err.txt',
    });

    expect(res.estadoApp).toBe('REQUIERE_CORRECCION');
    expect(res.statusSoftland).toBe('E');
    expect(repo.transacciones[0].statusSoftland).toBe('E');
    expect(repo.transacciones[0].errorMensaje).toMatch(/CO_Err\.txt/);
    expect(repo.intentos[0].cerradoAt).not.toBeNull();
  });

  it('status N sobre un error que no está REPROCESANDO no marca nada', async () => {
    await service.sync([registro()]);

    const res = await service.registrarResultadoReproceso({
      empresa: 'AMCARG',
      modulo: '3. Compras',
      identi: 'LIQ100',
      statusSoftland: 'N',
    });

    expect(res.estadoApp).toBe('ERROR');
    expect(repo.transacciones[0].reprocesoNotificadoAt).toBeNull();
  });
});

describe('ErroresService — DESCARTADO', () => {
  let service: ErroresService;
  let repo: FakeRepo;

  const ultimoEvento = (): unknown => repo.eventos[repo.eventos.length - 1];

  beforeEach(async () => {
    repo = new FakeRepo();
    const moduleRef = await Test.createTestingModule({
      providers: [
        ErroresService,
        { provide: ErroresRepository, useValue: repo },
      ],
    }).compile();
    service = moduleRef.get(ErroresService);
    delete process.env.N8N_REPROCESO_WEBHOOK_URL;
  });

  it('se descarta a mano y deja un evento de descarte', async () => {
    await service.sync([registro()]);

    await service.cambiarEstado('t1', { estado: 'DESCARTADO' });

    expect(repo.transacciones[0].estadoApp).toBe('DESCARTADO');
    expect(ultimoEvento()).toMatchObject({
      tipo: 'descarte',
      titulo: 'Estado: Descartado',
    });
  });

  it('el sync no reabre un DESCARTADO aunque siga llegando con error', async () => {
    await service.sync([registro()]);
    await service.cambiarEstado('t1', { estado: 'DESCARTADO' });

    const res = await service.sync([registro({ error: 'Otro mensaje' })]);

    expect(res.reaparecidos).toBe(0);
    expect(repo.transacciones[0].estadoApp).toBe('DESCARTADO');
    expect(repo.transacciones[0].errorMensaje).toBe('Otro mensaje');
  });

  it('no se puede marcar como corregido mientras está descartado', async () => {
    await service.sync([registro()]);
    await service.cambiarEstado('t1', { estado: 'DESCARTADO' });

    await expect(service.solicitarReproceso('t1', {})).rejects.toThrow(
      /descartado/i,
    );
    expect(repo.intentos).toHaveLength(0);
  });

  it('reabrirlo deja el evento "Reabierto"', async () => {
    await service.sync([registro()]);
    await service.cambiarEstado('t1', { estado: 'DESCARTADO' });

    await service.cambiarEstado('t1', { estado: 'ERROR' });

    expect(repo.transacciones[0].estadoApp).toBe('ERROR');
    expect(ultimoEvento()).toMatchObject({ titulo: 'Reabierto: Error' });
  });

  it('si llega el resultado de un reproceso viejo, guarda el status y sigue descartado', async () => {
    await service.sync([registro()]);
    await service.solicitarReproceso('t1', {});
    await service.cambiarEstado('t1', { estado: 'DESCARTADO' });

    const res = await service.registrarResultadoReproceso({
      empresa: 'AMCARG',
      modulo: '3. Compras',
      identi: 'LIQ100',
      statusSoftland: 'E',
    });

    expect(res.estadoApp).toBe('DESCARTADO');
    expect(repo.transacciones[0].estadoApp).toBe('DESCARTADO');
    expect(repo.transacciones[0].statusSoftland).toBe('E');
    expect(repo.intentos[0].statusDespues).toBe('E');
  });
});

describe('ErroresService — verificación (flujo 5)', () => {
  let service: ErroresService;
  let repo: FakeRepo;

  const ultimoEvento = (): any => repo.eventos[repo.eventos.length - 1];
  const clave = {
    empresa: 'AMCARG',
    modulo: '3. Compras',
    identi: 'LIQ100',
  };

  beforeEach(async () => {
    repo = new FakeRepo();
    const moduleRef = await Test.createTestingModule({
      providers: [
        ErroresService,
        { provide: ErroresRepository, useValue: repo },
      ],
    }).compile();
    service = moduleRef.get(ErroresService);
    delete process.env.N8N_REPROCESO_WEBHOOK_URL;
  });

  it('sirve la clave de los errores abiertos, sin el detalle', async () => {
    await service.sync([registro()]);

    const pendientes = await service.verificacionPendientes();

    expect(pendientes).toHaveLength(1);
    expect(pendientes[0]).toMatchObject({
      empresa: 'AMCARG',
      modulo: 'COMPRAS',
      moduloOrigen: '3. Compras',
      identi: 'LIQ100',
      statusConocido: 'E',
      ultimaVerificacion: null,
    });
  });

  it('no ofrece a verificar lo que tiene un reproceso en curso', async () => {
    await service.sync([registro()]);
    await service.solicitarReproceso('t1', {});

    expect(await service.verificacionPendientes()).toHaveLength(0);
  });

  it('status S => RESUELTO por verificación automática, sin intento de reproceso', async () => {
    await service.sync([registro()]);

    const res = await service.registrarVerificacion({
      ...clave,
      statusSoftland: 'S',
    });

    expect(res).toMatchObject({ cerrado: true, reabierto: false });
    expect(repo.transacciones[0].estadoApp).toBe('RESUELTO');
    expect(repo.transacciones[0].origenCierre).toBe('VERIFICACION_AUTOMATICA');
    expect(repo.transacciones[0].fechaResolucion).toBeInstanceOf(Date);
    expect(repo.transacciones[0].ultimaVerificacionAt).toBeInstanceOf(Date);
    expect(repo.intentos).toHaveLength(0);
    expect(ultimoEvento()).toMatchObject({
      titulo: 'Resuelto fuera de la app',
    });
  });

  it('un cierre por reproceso queda marcado como MANUAL, no como automático', async () => {
    await service.sync([registro()]);
    await service.solicitarReproceso('t1', {});

    await service.registrarResultadoReproceso({
      ...clave,
      statusSoftland: 'S',
    });

    expect(repo.transacciones[0].estadoApp).toBe('RESUELTO');
    expect(repo.transacciones[0].origenCierre).toBe('MANUAL');
  });

  it('sigue en E => no se toca, sólo queda la marca de verificación', async () => {
    await service.sync([registro()]);
    const eventosAntes = repo.eventos.length;

    const res = await service.registrarVerificacion({
      ...clave,
      statusSoftland: 'E',
    });

    expect(res).toMatchObject({ cerrado: false, reabierto: false });
    expect(repo.transacciones[0].estadoApp).toBe('ERROR');
    expect(repo.transacciones[0].ultimaVerificacionAt).toBeInstanceOf(Date);
    expect(repo.eventos).toHaveLength(eventosAntes);
  });

  it('sin status (la consulta no devolvió filas) NO cierra el error', async () => {
    await service.sync([registro()]);

    const res = await service.registrarVerificacion({
      ...clave,
      statusSoftland: null,
    });

    expect(res.cerrado).toBe(false);
    expect(repo.transacciones[0].estadoApp).toBe('ERROR');
    expect(repo.transacciones[0].ultimaVerificacionAt).toBeInstanceOf(Date);
  });

  it('status N => sigue en cola, sin cambios de estado', async () => {
    await service.sync([registro()]);

    const res = await service.registrarVerificacion({
      ...clave,
      statusSoftland: 'N',
    });

    expect(res.cerrado).toBe(false);
    expect(repo.transacciones[0].estadoApp).toBe('ERROR');
    expect(repo.transacciones[0].statusSoftland).toBe('N');
  });

  it('un status desconocido no cierra nada', async () => {
    await service.sync([registro()]);

    const res = await service.registrarVerificacion({
      ...clave,
      statusSoftland: 'Z',
    });

    expect(res.cerrado).toBe(false);
    expect(repo.transacciones[0].estadoApp).toBe('ERROR');
  });

  it('no pisa un reproceso en curso: ese lo cierra el flujo 4', async () => {
    await service.sync([registro()]);
    await service.solicitarReproceso('t1', {});

    const res = await service.registrarVerificacion({
      ...clave,
      statusSoftland: 'S',
    });

    expect(res.cerrado).toBe(false);
    expect(repo.transacciones[0].estadoApp).toBe('REPROCESANDO');
    expect(repo.transacciones[0].origenCierre).toBeNull();
  });

  it('un DESCARTADO no vuelve a la bandeja ni se cierra', async () => {
    await service.sync([registro()]);
    await service.cambiarEstado('t1', { estado: 'DESCARTADO' });

    const res = await service.registrarVerificacion({
      ...clave,
      statusSoftland: 'S',
    });

    expect(res.cerrado).toBe(false);
    expect(repo.transacciones[0].estadoApp).toBe('DESCARTADO');
    expect(repo.transacciones[0].origenCierre).toBeNull();
  });

  it('reabre lo que se había cerrado solo y volvió a fallar', async () => {
    await service.sync([registro()]);
    await service.registrarVerificacion({ ...clave, statusSoftland: 'S' });

    const res = await service.registrarVerificacion({
      ...clave,
      statusSoftland: 'E',
      error: 'Volvió a fallar',
    });

    expect(res).toMatchObject({ reabierto: true, cerrado: false });
    expect(repo.transacciones[0].estadoApp).toBe('ERROR');
    expect(repo.transacciones[0].origenCierre).toBeNull();
    expect(repo.transacciones[0].fechaResolucion).toBeNull();
    expect(repo.transacciones[0].errorMensaje).toBe('Volvió a fallar');
    expect(ultimoEvento()).toMatchObject({
      titulo: 'El error volvió a fallar en Softland',
    });
  });

  it('el sync también limpia el origen al reabrir un cierre automático', async () => {
    await service.sync([registro()]);
    await service.registrarVerificacion({ ...clave, statusSoftland: 'S' });

    const res = await service.sync([registro()]);

    expect(res.reaparecidos).toBe(1);
    expect(repo.transacciones[0].estadoApp).toBe('ERROR');
    expect(repo.transacciones[0].origenCierre).toBeNull();
  });

  it('404 si la clave no existe en la app', async () => {
    await expect(
      service.registrarVerificacion({ ...clave, statusSoftland: 'S' }),
    ).rejects.toThrow(/No existe/i);
  });
});

describe('ErroresService — borrar empresa', () => {
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

    await service.sync([
      registro({ empresa: 'IFLOW2', empresaNombre: 'I FLOW S.A.2' }),
      registro({
        empresa: 'IFLOW2',
        empresaNombre: 'I FLOW S.A.2',
        identi: 'LIQ101',
      }),
      registro({ empresa: 'NORFLOW', empresaNombre: 'NORFLOW S.A.' }),
    ]);
  });

  it('el resumen cuenta los errores sin borrar nada', async () => {
    const res = await service.resumenEmpresa('IFLOW2');

    expect(res).toEqual({
      codigo: 'IFLOW2',
      nombre: 'I FLOW S.A.2',
      errores: 2,
    });
    expect(repo.transacciones).toHaveLength(3);
  });

  it('borra la empresa y sus errores, sin tocar las demás', async () => {
    const res = await service.borrarEmpresa('IFLOW2');

    expect(res).toEqual({
      codigo: 'IFLOW2',
      nombre: 'I FLOW S.A.2',
      erroresBorrados: 2,
    });
    expect(repo.empresas.has('IFLOW2')).toBe(false);
    expect(repo.empresas.has('NORFLOW')).toBe(true);
    const quedan = repo.transacciones.map(
      (t: { empresaCodigo: string }) => t.empresaCodigo,
    );
    expect(quedan).toEqual(['NORFLOW']);
  });

  it('una empresa que no existe da 404 y no borra nada', async () => {
    await expect(service.borrarEmpresa('NOEXISTE')).rejects.toThrow(
      /No existe la empresa NOEXISTE/,
    );
    await expect(service.resumenEmpresa('NOEXISTE')).rejects.toThrow(
      /No existe/,
    );
    expect(repo.transacciones).toHaveLength(3);
  });
});

describe('ErroresService — historial y mi espacio', () => {
  const haceHoras = (h: number) => new Date(Date.now() - h * 60 * 60 * 1000);

  const fila = (over: Record<string, unknown>) => ({
    id: 'x',
    empresaCodigo: 'AMCARG',
    empresa: { codigo: 'AMCARG', nombre: 'AM CARGAS S.A.' },
    modulo: 'COMPRAS',
    moduloOrigen: '3. Compras',
    identi: 'LIQ1',
    cuenta: null,
    fechaMovimiento: null,
    statusSoftland: 'E',
    errorMensaje: 'El proveedor no existe',
    archivoLog: null,
    estadoApp: 'ERROR',
    responsableId: null,
    intentos: 0,
    corregidoPorId: null,
    corregidoPorNombre: null,
    fechaCorreccion: null,
    reprocesoNotificadoAt: null,
    reprocesoDesaparecioAt: null,
    resultadoSolicitadoAt: null,
    origenCierre: null,
    ultimaVerificacionAt: null,
    fechaResolucion: null,
    fechaDeteccion: haceHoras(100),
    ultimaDeteccion: haceHoras(1),
    presenteEnUltimaSync: true,
    createdAt: haceHoras(100),
    updatedAt: haceHoras(1),
    ...over,
  });

  // Catalina (u1) corrigió dos: uno ya resuelto y otro esperando. El tercero
  // lo había mandado ella pero lo cerró la verificación automática.
  const resueltoPorCata = fila({
    id: 'r1',
    identi: 'LIQ10',
    estadoApp: 'RESUELTO',
    origenCierre: 'MANUAL',
    corregidoPorId: 'u1',
    corregidoPorNombre: 'Catalina',
    fechaDeteccion: haceHoras(5),
    fechaCorreccion: haceHoras(4),
    fechaResolucion: haceHoras(3),
  });
  const esperando = fila({
    id: 'r2',
    identi: 'LIQ11',
    modulo: 'FACTURACION',
    estadoApp: 'REPROCESANDO',
    corregidoPorId: 'u1',
    corregidoPorNombre: 'Catalina',
    fechaCorreccion: haceHoras(2),
  });
  const automatico = fila({
    id: 'r3',
    identi: 'LIQ12',
    estadoApp: 'RESUELTO',
    origenCierre: 'VERIFICACION_AUTOMATICA',
    corregidoPorId: 'u1',
    corregidoPorNombre: 'Catalina',
    fechaCorreccion: haceHoras(24 * 20),
    fechaResolucion: haceHoras(1),
  });
  const asignadoViejo = fila({
    id: 'a1',
    identi: 'LIQ20',
    estadoApp: 'ASIGNADO',
    responsableId: 'u1',
    fechaDeteccion: haceHoras(48),
  });
  const asignadoNuevo = fila({
    id: 'a2',
    identi: 'LIQ21',
    modulo: 'COBRANZAS',
    estadoApp: 'EN_PROGRESO',
    responsableId: 'u1',
    fechaDeteccion: haceHoras(2),
  });

  let service: ErroresService;
  let llamadas: { cierresDesde: any[]; listar: any[] };

  beforeEach(async () => {
    llamadas = { cierresDesde: [], listar: [] };
    const repo = {
      eventosDesde: () => Promise.resolve([]),
      contar: () => Promise.resolve(2),
      contarIntentos: () => Promise.resolve(3),
      contarObservaciones: () => Promise.resolve(0),
      contarEventos: () => Promise.resolve(0),
      cierresDesde: (desde: Date, where: any = {}) => {
        llamadas.cierresDesde.push({ desde, where });
        return Promise.resolve([resueltoPorCata, automatico, esperando]);
      },
      // Como Prisma: el más nuevo primero.
      listar: (where: any) => {
        llamadas.listar.push(where);
        return Promise.resolve([asignadoNuevo, asignadoViejo]);
      },
      intentosDeUsuario: () =>
        Promise.resolve([
          { statusDespues: 'S', cerradoAt: haceHoras(3) },
          { statusDespues: 'E', cerradoAt: haceHoras(10) },
          { statusDespues: null, cerradoAt: null },
        ]),
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        ErroresService,
        { provide: ErroresRepository, useValue: repo },
      ],
    }).compile();
    service = moduleRef.get(ErroresService);
  });

  it('el historial trae los cierres del período, el más reciente primero', async () => {
    const res = await service.historial(7);

    expect(
      res.cierres.map((c) => [c.codigo, c.tipoCierre, c.cerradoPor]),
    ).toEqual([
      ['LIQ12', 'resuelto', null],
      ['LIQ11', 'corregido', 'Catalina'],
      ['LIQ10', 'resuelto', 'Catalina'],
    ]);
    // La corrección de LIQ12 fue hace 20 días: no entra en los 7.
    expect(res.corregidos).toBe(2);
    expect(res.serie).toHaveLength(7);
    const total = (campo: 'resueltos' | 'corregidos') =>
      res.serie.reduce((acc, p) => acc + p[campo], 0);
    expect(total('resueltos')).toBe(2);
    expect(total('corregidos')).toBe(2);
    expect(res.tiempoPromedioResolucionMinutos).toBeGreaterThan(0);
  });

  it('mi espacio filtra por el usuario y no se adjudica lo automático', async () => {
    const res = await service.miEspacio('u1', 30);

    expect(llamadas.cierresDesde[0].where).toEqual({ corregidoPorId: 'u1' });
    expect(llamadas.listar[0]).toMatchObject({ responsableId: 'u1' });

    expect(res.asignados.map((a) => a.codigo)).toEqual(['LIQ20', 'LIQ21']);
    expect(res.corregidos.map((c) => c.codigo)).toEqual(['LIQ11', 'LIQ10']);
    expect(res.metricas).toMatchObject({
      asignados: 2,
      corregidos: 2,
      resueltos: 1,
      esperandoResultado: 1,
      fallidos: 1,
      efectividad: 50,
      tiempoPromedioResolucionMinutos: 120,
    });
    expect(res.metricas.asignadoMasViejoMinutos).toBeGreaterThanOrEqual(
      48 * 60 - 1,
    );
    expect(res.porModulo).toEqual([
      {
        modulo: 'FACTURACION',
        label: 'Facturación',
        asignados: 0,
        corregidos: 1,
      },
      { modulo: 'COMPRAS', label: 'Compras', asignados: 1, corregidos: 1 },
      { modulo: 'COBRANZAS', label: 'Cobranzas', asignados: 1, corregidos: 0 },
    ]);
  });

  it('sin reprocesos con resultado, la efectividad queda en null', async () => {
    (service as any).repo.intentosDeUsuario = () => Promise.resolve([]);
    const res = await service.miEspacio('u1', 7);

    expect(res.metricas.efectividad).toBeNull();
    expect(res.metricas.esperandoResultado).toBe(0);
  });
});

describe('ErroresService.dashboard — status X', () => {
  it('no cuenta los X como errores abiertos y los informa aparte', async () => {
    const contar = jest.fn((where: { statusSoftland?: unknown }) =>
      Promise.resolve(where.statusSoftland === 'X' ? 13 : 19),
    );
    const repo = {
      contarPorEstado: jest.fn().mockResolvedValue([]),
      contar,
      resueltosDesde: jest.fn().mockResolvedValue([]),
      resueltosParaPromedio: jest.fn().mockResolvedValue([]),
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        ErroresService,
        { provide: ErroresRepository, useValue: repo },
      ],
    }).compile();

    const res = await moduleRef.get(ErroresService).dashboard();

    expect(res.erroresAbiertos).toBe(19);
    expect(res.sinResponsable).toBe(19);
    expect(res.excluidasAbiertas).toBe(13);
    expect(contar).toHaveBeenCalledWith(
      expect.objectContaining({
        statusSoftland: { not: 'X' },
        responsableId: null,
      }),
    );
  });
});

describe('ErroresService — hitos de métricas', () => {
  let service: ErroresService;
  let repo: FakeRepo;

  const tipos = () => repo.metricas.map((m) => m.tipo);

  beforeEach(async () => {
    repo = new FakeRepo();
    repo.buscarUsuario = (id?: string) =>
      Promise.resolve(
        id ? { id, nombre: `Persona ${id}`, avatarIniciales: 'PP' } : null,
      ) as any;
    const moduleRef = await Test.createTestingModule({
      providers: [
        ErroresService,
        { provide: ErroresRepository, useValue: repo },
      ],
    }).compile();
    service = moduleRef.get(ErroresService);
  });

  it('un error nuevo deja una LLEGADA; reenviarlo no suma otra', async () => {
    await service.sync([registro()]);
    await service.sync([registro()]);

    expect(tipos()).toEqual(['LLEGADA']);
    expect(repo.metricas[0]).toMatchObject({
      transaccionId: 't1',
      empresaCodigo: 'AMCARG',
      modulo: 'COMPRAS',
    });
  });

  it('asignar deja una ASIGNACION a nombre del responsable, no del autor', async () => {
    await service.sync([registro()]);
    await service.asignar('t1', { responsableId: 'u2' }, 'u1');

    expect(repo.metricas[1]).toMatchObject({
      tipo: 'ASIGNACION',
      usuarioId: 'u2',
      usuarioNombre: 'Persona u2',
    });
  });

  it('el reproceso exitoso se le cuenta a quien lo corrigió', async () => {
    await service.sync([registro()]);
    await service.solicitarReproceso('t1', {}, 'u1');
    await service.registrarResultadoReproceso({
      empresa: 'AMCARG',
      modulo: '3. Compras',
      identi: 'LIQ100',
      statusSoftland: 'S',
    });

    expect(tipos()).toEqual(['LLEGADA', 'CORRECCION', 'RESOLUCION']);
    expect(repo.metricas[2]).toMatchObject({
      origenCierre: 'MANUAL',
      usuarioId: 'u1',
    });
  });

  it('el reproceso que vuelve con error deja un FALLO_REPROCESO', async () => {
    await service.sync([registro()]);
    await service.solicitarReproceso('t1', {}, 'u1');
    await service.registrarResultadoReproceso({
      empresa: 'AMCARG',
      modulo: '3. Compras',
      identi: 'LIQ100',
      statusSoftland: 'E',
      error: 'Sigue sin proveedor',
    });

    expect(tipos()).toEqual(['LLEGADA', 'CORRECCION', 'FALLO_REPROCESO']);
  });
});
