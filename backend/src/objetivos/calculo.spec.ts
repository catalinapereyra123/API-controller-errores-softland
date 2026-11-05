import type { EventoMetrica } from '../../generated/prisma/client';
import {
  IndicadorObjetivo,
  OrigenCierre,
  SentidoMeta,
  TipoMetrica,
} from '../../generated/prisma/client';
import { estadoDe, progreso, valorDePeriodo, ventanas } from './calculo';

const AHORA = new Date('2026-11-04T12:00:00');

let secuencia = 0;
function evento(
  tipo: TipoMetrica,
  transaccionId: string,
  createdAt: string,
  extra: Partial<EventoMetrica> = {},
): EventoMetrica {
  return {
    id: `ev${secuencia++}`,
    tipo,
    clase: 'ERROR',
    transaccionId,
    empresaCodigo: 'PAE',
    modulo: 'FACTURACION',
    usuarioId: null,
    usuarioNombre: null,
    origenCierre: null,
    minutosDesdeDeteccion: null,
    createdAt: new Date(createdAt),
    ...extra,
  };
}

describe('ventanas', () => {
  it('la actual arranca a las 00:00 y la anterior tiene el mismo largo', () => {
    const { actual, anterior } = ventanas(7, AHORA);
    expect(actual.desde).toEqual(new Date('2026-10-29T00:00:00'));
    expect(actual.hasta).toEqual(AHORA);
    expect(anterior.desde).toEqual(new Date('2026-10-22T00:00:00'));
    expect(anterior.hasta).toEqual(actual.desde);
  });
});

describe('valorDePeriodo', () => {
  const { actual } = ventanas(30, AHORA);

  it('resueltos a tiempo: no cuenta los que todavía no cumplieron el umbral', () => {
    const eventos = [
      // a: llegó y se resolvió en 10 h -> a tiempo
      evento(TipoMetrica.LLEGADA, 'a', '2026-10-20T08:00:00'),
      evento(TipoMetrica.RESOLUCION, 'a', '2026-10-20T18:00:00', {
        minutosDesdeDeteccion: 600,
      }),
      // b: se resolvió en 3 días -> tarde
      evento(TipoMetrica.LLEGADA, 'b', '2026-10-21T08:00:00'),
      evento(TipoMetrica.RESOLUCION, 'b', '2026-10-24T08:00:00', {
        minutosDesdeDeteccion: 4320,
      }),
      // c: sigue abierto y ya pasaron más de 48 h -> tarde
      evento(TipoMetrica.LLEGADA, 'c', '2026-10-25T08:00:00'),
      // d: llegó hace 2 h, todavía tiene chance -> no cuenta
      evento(TipoMetrica.LLEGADA, 'd', '2026-11-04T10:00:00'),
      // e: descartado -> no cuenta
      evento(TipoMetrica.LLEGADA, 'e', '2026-10-26T08:00:00'),
      evento(TipoMetrica.DESCARTE, 'e', '2026-10-26T09:00:00'),
    ];
    expect(
      valorDePeriodo(IndicadorObjetivo.RESUELTOS_A_TIEMPO, eventos, actual, {
        umbralHoras: 48,
        ahora: AHORA,
      }),
    ).toBe(33);
  });

  it('resueltos a tiempo: sin llegadas elegibles no hay dato', () => {
    expect(
      valorDePeriodo(IndicadorObjetivo.RESUELTOS_A_TIEMPO, [], actual, {
        ahora: AHORA,
      }),
    ).toBeNull();
  });

  it('tiempo hasta asignar: sólo la primera asignación de cada error, en horas', () => {
    const eventos = [
      evento(TipoMetrica.ASIGNACION, 'a', '2026-10-20T10:00:00', {
        minutosDesdeDeteccion: 120,
      }),
      // reasignación: no infla el promedio
      evento(TipoMetrica.ASIGNACION, 'a', '2026-10-22T10:00:00', {
        minutosDesdeDeteccion: 3000,
      }),
      evento(TipoMetrica.ASIGNACION, 'b', '2026-10-21T10:00:00', {
        minutosDesdeDeteccion: 240,
      }),
    ];
    expect(
      valorDePeriodo(IndicadorObjetivo.TIEMPO_ASIGNACION, eventos, actual),
    ).toBe(3);
  });

  it('efectividad: resueltos por reproceso sobre los que tienen resultado', () => {
    const eventos = [
      evento(TipoMetrica.RESOLUCION, 'a', '2026-10-20T10:00:00', {
        origenCierre: OrigenCierre.MANUAL,
      }),
      evento(TipoMetrica.RESOLUCION, 'b', '2026-10-20T11:00:00', {
        origenCierre: OrigenCierre.MANUAL,
      }),
      evento(TipoMetrica.RESOLUCION, 'c', '2026-10-20T12:00:00', {
        origenCierre: OrigenCierre.VERIFICACION_AUTOMATICA,
      }),
      evento(TipoMetrica.FALLO_REPROCESO, 'd', '2026-10-20T13:00:00'),
    ];
    expect(
      valorDePeriodo(IndicadorObjetivo.EFECTIVIDAD_REPROCESO, eventos, actual),
    ).toBe(67);
  });

  it('los contadores sólo miran la ventana', () => {
    const eventos = [
      evento(TipoMetrica.REAPARICION, 'a', '2026-09-01T10:00:00'),
      evento(TipoMetrica.REAPARICION, 'b', '2026-10-30T10:00:00'),
    ];
    expect(
      valorDePeriodo(IndicadorObjetivo.REAPARICIONES, eventos, actual),
    ).toBe(1);
  });
});

describe('progreso y estado', () => {
  it('al menos: proporcional a la meta, con tope en 100', () => {
    expect(progreso(60, 80, SentidoMeta.AL_MENOS)).toBe(75);
    expect(progreso(95, 80, SentidoMeta.AL_MENOS)).toBe(100);
  });

  it('a lo sumo: cumplido por debajo, baja si se pasa', () => {
    expect(progreso(3, 4, SentidoMeta.A_LO_SUMO)).toBe(100);
    expect(progreso(8, 4, SentidoMeta.A_LO_SUMO)).toBe(50);
    expect(progreso(2, 0, SentidoMeta.A_LO_SUMO)).toBe(0);
  });

  it('sin valor no hay progreso', () => {
    expect(progreso(null, 80, SentidoMeta.AL_MENOS)).toBeNull();
    expect(estadoDe(null)).toBe('SIN_DATOS');
  });

  it('estados por tramo', () => {
    expect(estadoDe(100)).toBe('CUMPLIDO');
    expect(estadoDe(70)).toBe('EN_CAMINO');
    expect(estadoDe(69)).toBe('EN_RIESGO');
  });
});
