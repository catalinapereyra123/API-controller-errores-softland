/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
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
        continue; // relación: no la modela el fake
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

  crearIntento = (data: any) => {
    const row = {
      id: `i${this.intentos.length + 1}`,
      cerradoAt: null,
      ...data,
    };
    this.intentos.push(row);
    return Promise.resolve(row);
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
          !['REPROCESANDO', 'RESUELTO'].includes(t.estadoApp),
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
      this.transacciones.filter((t) =>
        where?.estadoApp ? t.estadoApp === where.estadoApp : true,
      ),
    );

  buscarUsuario = () => Promise.resolve(null);
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
      autorId: undefined,
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

  it('status N => sin cambios', async () => {
    await service.sync([registro()]);
    repo.transacciones[0].estadoApp = 'REPROCESANDO';

    const res = await service.registrarResultadoReproceso({
      empresa: 'AMCARG',
      modulo: '3. Compras',
      identi: 'LIQ100',
      statusSoftland: 'N',
    });

    expect(res.statusSoftland).toBe('N');
    expect(repo.transacciones[0].estadoApp).toBe('REPROCESANDO');
  });
});
