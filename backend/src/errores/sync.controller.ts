import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiKeyGuard } from '../common/api-key.guard';
import { ResultadoReprocesoDto } from './dto/resultado-reproceso.dto';
import { SyncErrorDto } from './dto/sync-error.dto';
import { SyncRequestDto } from './dto/sync-request.dto';
import { ErroresService } from './errores.service';
import { SyncRequestPipe } from './pipes/sync-request.pipe';

/**
 * Endpoints que consume el integrador. Protegidos con `x-api-key`.
 *
 * Flujo 1 — POST /errores/sync
 *   Body recomendado: { empresasConsultadas: [...], errores: [...] }
 *   También acepta el array histórico para no cortar integraciones existentes.
 *   Upsert por (empresa, modulo, identi); no pisa el estado de gestión.
 *
 * Flujo 4 — POST /errores/resultado-reproceso
 *   Body: { empresa, modulo, identi, statusSoftland, error? }
 *   n8n reporta el status que devolvió Softland tras el reproceso.
 */
@Controller('errores')
@UseGuards(ApiKeyGuard)
export class SyncController {
  constructor(private readonly service: ErroresService) {}

  @Post('sync')
  @HttpCode(200)
  sync(@Body(SyncRequestPipe) request: SyncRequestDto) {
    return this.service.sync(request.errores, request.empresasConsultadas);
  }

  @Post('resultado-reproceso')
  @HttpCode(200)
  resultadoReproceso(@Body() dto: ResultadoReprocesoDto) {
    return this.service.registrarResultadoReproceso(dto);
  }

  @Post('sync-batch')
  @HttpCode(200)
  syncBatch(
    @Body()
    data:
      | Array<{
          EmpresaCodigo: string;
          Empresa: string;
          Modulo: string;
          Identi: string;
          FechaMovimiento?: string;
          Cuenta?: string;
          Status: string;
          Error?: string;
        }>
      | {
          EmpresaCodigo: string;
          Empresa: string;
          Modulo: string;
          Identi: string;
          FechaMovimiento?: string;
          Cuenta?: string;
          Status: string;
          Error?: string;
        },
  ) {
    const arr = Array.isArray(data) ? data : [data];
    const dtos: SyncErrorDto[] = arr.map((item) => ({
      empresa: item.EmpresaCodigo,
      empresaNombre: item.Empresa,
      modulo: item.Modulo,
      identi: item.Identi,
      statusSoftland: item.Status,
      error: item.Error,
      cuenta: item.Cuenta,
      fecha: item.FechaMovimiento,
    }));

    const empresas = [...new Set(arr.map((item) => item.EmpresaCodigo))];
    return this.service.sync(dtos, empresas);
  }
}
