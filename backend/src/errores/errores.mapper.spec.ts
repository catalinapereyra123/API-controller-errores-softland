import { BadRequestException } from '@nestjs/common';
import { EstadoApp, Modulo, OrigenCierre } from '../../generated/prisma/client';
import {
  MODULO_LABEL,
  armarSerie,
  etiquetaDia,
  extractArchivoLog,
  parseModulo,
  toErrorCierre,
  toErrorTransaccion,
} from './errores.mapper';

describe('parseModulo', () => {
  it('reconoce por número de prefijo', () => {
    expect(parseModulo('1. Facturacion')).toBe(Modulo.FACTURACION);
    expect(parseModulo('2. Cobranzas')).toBe(Modulo.COBRANZAS);
    expect(parseModulo('3. Compras')).toBe(Modulo.COMPRAS);
  });

  it('reconoce por palabra clave sin prefijo', () => {
    expect(parseModulo('Facturación')).toBe(Modulo.FACTURACION);
    expect(parseModulo('COMPRAS')).toBe(Modulo.COMPRAS);
    expect(parseModulo('Recibos')).toBe(Modulo.COBRANZAS);
  });

  it('lanza 400 si no lo reconoce', () => {
    expect(() => parseModulo('9. Cartera')).toThrow(BadRequestException);
  });
});

describe('extractArchivoLog', () => {
  it('extrae la ruta del .txt del mensaje', () => {
    expect(
      extractArchivoLog(
        'Se ha producido un error, verificar el archivo c:\\padron\\2026-08-26_18.35.17.080_FC_Err_AM.txt',
      ),
    ).toBe('c:\\padron\\2026-08-26_18.35.17.080_FC_Err_AM.txt');
  });

  it('devuelve null si no hay archivo', () => {
    expect(extractArchivoLog('El cliente no existe')).toBeNull();
    expect(extractArchivoLog(null)).toBeNull();
  });
});

/** Una fila de TransaccionError recién detectada. */
const base = {
  id: 'abc',
  empresaCodigo: 'AMCARG',
  modulo: Modulo.COMPRAS,
  moduloOrigen: '3. Compras',
  identi: 'LIQ29948',
  cuenta: ' 9167',
  fechaMovimiento: null,
  statusSoftland: 'E',
  errorMensaje: 'El proveedor no existe',
  archivoLog: null,
  estadoApp: EstadoApp.ERROR,
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
  fechaDeteccion: new Date('2026-08-28T15:00:00Z'),
  ultimaDeteccion: new Date('2026-08-28T18:00:00Z'),
  presenteEnUltimaSync: true,
  createdAt: new Date('2026-08-28T15:00:00Z'),
  updatedAt: new Date('2026-08-28T18:00:00Z'),
};

describe('toErrorTransaccion', () => {
  it('mapea a la forma que espera el front', () => {
    expect(toErrorTransaccion(base)).toMatchObject({
      id: 'abc',
      codigo: 'LIQ29948',
      estado: EstadoApp.ERROR,
      empresaId: 'AMCARG',
      modulo: MODULO_LABEL.COMPRAS,
      descripcion: 'El proveedor no existe',
      responsableId: null,
      abiertoDesde: '2026-08-28T15:00:00.000Z',
      intentos: 0,
    });
  });

  it('usa un placeholder cuando no hay mensaje', () => {
    expect(
      toErrorTransaccion({ ...base, errorMensaje: null }).descripcion,
    ).toBe('—');
    expect(
      toErrorTransaccion({ ...base, errorMensaje: null, statusSoftland: 'X' })
        .descripcion,
    ).toMatch(/exclu/i);
  });
});

describe('etiquetaDia', () => {
  // Lunes 28/09/2026, mediodía.
  const hoy = new Date(2026, 8, 28, 12, 0);

  it('dice Hoy y Ayer', () => {
    expect(etiquetaDia(new Date(2026, 8, 28, 8, 0), hoy)).toBe('Hoy');
    expect(etiquetaDia(new Date(2026, 8, 27, 23, 0), hoy)).toBe('Ayer');
  });

  it('usa el día de la semana dentro de los últimos 7 días', () => {
    expect(etiquetaDia(new Date(2026, 8, 22, 0, 30), hoy)).toBe('Martes');
  });

  it('usa la fecha para días más viejos', () => {
    expect(etiquetaDia(new Date(2026, 8, 21, 18, 0), hoy)).toBe('21/09/2026');
  });
});

describe('toErrorCierre', () => {
  const desde = new Date('2026-10-20T00:00:00Z');
  const corregido = {
    ...base,
    corregidoPorId: 'u1',
    corregidoPorNombre: 'Catalina Pereyra',
    fechaCorreccion: new Date('2026-10-21T10:00:00Z'),
  };

  it('un resuelto por reproceso lleva quién lo corrigió y cuánto tardó', () => {
    const cierre = toErrorCierre(
      {
        ...corregido,
        estadoApp: EstadoApp.RESUELTO,
        origenCierre: OrigenCierre.MANUAL,
        fechaDeteccion: new Date('2026-10-21T08:00:00Z'),
        fechaResolucion: new Date('2026-10-21T11:30:00Z'),
      },
      desde,
    );

    expect(cierre).toMatchObject({
      codigo: 'LIQ29948',
      tipoCierre: 'resuelto',
      fechaCierre: '2026-10-21T11:30:00.000Z',
      cerradoPor: 'Catalina Pereyra',
      minutosResolucion: 210,
    });
  });

  it('lo que cerró la verificación automática no tiene autor', () => {
    const cierre = toErrorCierre(
      {
        ...corregido,
        estadoApp: EstadoApp.RESUELTO,
        origenCierre: OrigenCierre.VERIFICACION_AUTOMATICA,
        fechaResolucion: new Date('2026-10-22T09:00:00Z'),
      },
      desde,
    );

    expect(cierre.tipoCierre).toBe('resuelto');
    expect(cierre.cerradoPor).toBeNull();
  });

  it('uno mandado a reprocesar que todavía no se resolvió es "corregido"', () => {
    const cierre = toErrorCierre(
      { ...corregido, estadoApp: EstadoApp.REPROCESANDO },
      desde,
    );

    expect(cierre).toMatchObject({
      tipoCierre: 'corregido',
      fechaCierre: '2026-10-21T10:00:00.000Z',
      cerradoPor: 'Catalina Pereyra',
      minutosResolucion: null,
    });
  });
});

describe('armarSerie', () => {
  it('un punto por día, con los días sin movimiento en 0', () => {
    const serie = armarSerie(
      new Date(2026, 9, 20, 0, 0),
      {
        resueltos: [new Date(2026, 9, 20, 9, 0), new Date(2026, 9, 22, 18, 0)],
        corregidos: [new Date(2026, 9, 22, 8, 0)],
      },
      new Date(2026, 9, 22, 19, 0),
    );

    expect(serie).toEqual([
      { id: '2026-10-20', etiqueta: '20/10', resueltos: 1, corregidos: 0 },
      { id: '2026-10-21', etiqueta: '21/10', resueltos: 0, corregidos: 0 },
      { id: '2026-10-22', etiqueta: '22/10', resueltos: 1, corregidos: 1 },
    ]);
  });

  it('si el período es sólo hoy, va por hora hasta la hora actual', () => {
    const serie = armarSerie(
      new Date(2026, 9, 22, 0, 0),
      { resueltos: [new Date(2026, 9, 22, 2, 45)], corregidos: [] },
      new Date(2026, 9, 22, 3, 10),
    );

    expect(serie.map((p) => p.etiqueta)).toEqual(['0 h', '1 h', '2 h', '3 h']);
    expect(serie[2]).toMatchObject({ id: '2026-10-22T02', resueltos: 1 });
  });

  it('ignora fechas fuera del período', () => {
    const serie = armarSerie(
      new Date(2026, 9, 21, 0, 0),
      { resueltos: [new Date(2026, 9, 19, 12, 0)], corregidos: [] },
      new Date(2026, 9, 22, 12, 0),
    );

    expect(serie.every((p) => p.resueltos === 0)).toBe(true);
  });
});
