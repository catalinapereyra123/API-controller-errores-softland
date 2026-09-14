import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiKeyGuard } from '../common/api-key.guard';
import { ResultadoReprocesoDto } from './dto/resultado-reproceso.dto';
import { SyncErrorDto } from './dto/sync-error.dto';
import { SyncRequestDto } from './dto/sync-request.dto';
import { VerificacionDto } from './dto/verificacion.dto';
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
 * Flujo 2 (polling) — GET /errores/integracion/reproceso-pendientes
 *   iFlow consulta qué transacciones esperan ser enviadas a Softland. El
 *   segmento `integracion/` no es decorativo: sin él la ruta la captura el
 *   `GET /errores/:id` de ErroresController (que pide JWT) y devuelve 401.
 *
 * Flujo 5 (verificación periódica) — GET /errores/integracion/verificacion-pendientes
 *   Claves de los errores abiertos que hay que chequear contra Softland, y
 *   POST /errores/verificacion para reportar el status encontrado. Sirve para
 *   cerrar los errores que se arreglaron por fuera de la app. Igual que arriba,
 *   el GET necesita el segmento `integracion/` para no chocar con
 *   `GET /errores/:id`.
 *
 * Flujo 4 — POST /errores/resultado-reproceso
 *   Body: { empresa, modulo, identi, statusSoftland, error? }
 *   n8n reporta el status que devolvió Softland tras el reproceso.
 */
@Controller('errores')
@UseGuards(ApiKeyGuard)
export class SyncController {
  constructor(private readonly service: ErroresService) {}

  @Get('integracion/reproceso-pendientes')
  reprocesoPendientes() {
    return this.service.reprocesoPendientes();
  }

  /**
   * Un solo pendiente (el más viejo) en vez del array, para los flujos que
   * mapean campo por campo y no saben recorrer listas. Si no hay nada
   * pendiente devuelve null.
   */
  @Get('integracion/reproceso-pendiente')
  reprocesoPendiente() {
    return this.service.reprocesoPendiente();
  }

  /**
   * Flujo 5, paso 1. `?limite=200` corta la corrida; como se sirve "lo menos
   * verificado primero", la siguiente sigue por donde quedó ésta.
   */
  @Get('integracion/verificacion-pendientes')
  verificacionPendientes(@Query('limite') limite?: string) {
    const n = Number(limite);
    return this.service.verificacionPendientes(
      Number.isInteger(n) && n > 0 ? n : undefined,
    );
  }

  /** Flujo 5, paso 3: el status que el integrador encontró en Softland. */
  @Post('verificacion')
  @HttpCode(200)
  verificacion(@Body() dto: VerificacionDto) {
    return this.service.registrarVerificacion(dto);
  }

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
