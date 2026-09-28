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
      origenCierre: null,
      ultimaVerificacionAt: null,
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

  /** Igualdad campo por campo: alcanza para el where simple del service. */
  primerPendiente = (where: any) =>
    Promise.resolve(
      this.transacciones.find((t) =>
        Object.entries(where).every(([campo, valor]) => t[campo] === valor),
      ) ?? null,
    );

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
      this.transacciones.filter((t) =>
        where?.estadoApp ? t.estadoApp === where.estadoApp : true,
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
