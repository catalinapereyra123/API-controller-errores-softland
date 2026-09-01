import { BadRequestException } from '@nestjs/common';
import { SyncRequestDto } from '../dto/sync-request.dto';
import { SyncRequestPipe } from './sync-request.pipe';

const metadata = { type: 'body' as const, metatype: SyncRequestDto };

describe('SyncRequestPipe', () => {
  const pipe = new SyncRequestPipe();
  const registro = {
    empresa: 'AMCARG',
    modulo: '1. Facturacion',
    identi: 'F2H5095_R',
    status: 'e',
    fechaMovimiento: '2026-08-11T00:00:00.000Z',
  };

  it('mantiene compatibilidad con el array histórico', async () => {
    const result = await pipe.transform([registro], metadata);

    expect(result).toMatchObject({
      empresasConsultadas: ['AMCARG'],
      errores: [
        {
          empresa: 'AMCARG',
          statusSoftland: 'E',
          fecha: '2026-08-11T00:00:00.000Z',
        },
      ],
    });
  });

  it('acepta empresas consultadas aunque el lote no tenga errores', async () => {
    const result = await pipe.transform(
      { empresasConsultadas: [' AMCARG '], errores: [] },
      metadata,
    );

    expect(result.empresasConsultadas).toEqual(['AMCARG']);
    expect(result.errores).toEqual([]);
  });

  it('rechaza estados de Softland desconocidos', async () => {
    await expect(
      pipe.transform([{ ...registro, status: 'Z' }], metadata),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
