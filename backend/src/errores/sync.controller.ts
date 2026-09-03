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

  @Post('sync-individual')
  @HttpCode(200)
  syncIndividual(
    @Body()
    data: {
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
    const dto: SyncErrorDto = {
      empresa: data.EmpresaCodigo,
      empresaNombre: data.Empresa,
      modulo: data.Modulo,
      identi: data.Identi,
      statusSoftland: data.Status,
      error: data.Error,
      cuenta: data.Cuenta,
      fecha: data.FechaMovimiento,
    };
    return this.service.sync([dto], [data.EmpresaCodigo]);
  }
}
