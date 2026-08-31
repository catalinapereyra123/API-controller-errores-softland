import { BadRequestException } from '@nestjs/common';
import { EstadoApp, Modulo } from '../../generated/prisma/client';
import {
  MODULO_LABEL,
  extractArchivoLog,
  parseModulo,
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

describe('toErrorTransaccion', () => {
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
    fechaResolucion: null,
    fechaDeteccion: new Date('2026-08-28T15:00:00Z'),
    ultimaDeteccion: new Date('2026-08-28T18:00:00Z'),
    presenteEnUltimaSync: true,
    createdAt: new Date('2026-08-28T15:00:00Z'),
    updatedAt: new Date('2026-08-28T18:00:00Z'),
  };

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
