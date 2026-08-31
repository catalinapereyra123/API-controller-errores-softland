import {
  Body,
  Controller,
  HttpCode,
  ParseArrayPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiKeyGuard } from '../common/api-key.guard';
import { ResultadoReprocesoDto } from './dto/resultado-reproceso.dto';
import { SyncErrorDto } from './dto/sync-error.dto';
import { ErroresService } from './errores.service';

/**
 * Endpoints que consume n8n. Protegidos con `x-api-key` (env INGEST_API_KEY).
 *
 * Flujo 1 — POST /errores/sync
 *   Body: [ { empresa, modulo, identi, statusSoftland, error, cuenta, fecha }, ... ]
 *   n8n manda TODOS los errores de todas las empresas en un solo POST.
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
  sync(
    @Body(
      new ParseArrayPipe({
        items: SyncErrorDto,
        whitelist: true,
        forbidNonWhitelisted: false,
      }),
    )
    registros: SyncErrorDto[],
  ) {
    return this.service.sync(registros);
  }

  @Post('resultado-reproceso')
  @HttpCode(200)
  resultadoReproceso(@Body() dto: ResultadoReprocesoDto) {
    return this.service.registrarResultadoReproceso(dto);
  }
}
