import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  AsignarDto,
  CambiarEstadoDto,
  CrearObservacionDto,
  SolicitarReprocesoDto,
} from './dto/mutaciones.dto';
import { QueryErroresDto } from './dto/query-errores.dto';
import { ErroresService } from './errores.service';

/**
 * Lectura + mutaciones para el front. Rutas sin prefijo para que matcheen con
 * `frontend/src/services/*` (p. ej. api('/errores'), api('/dashboard/stats')).
 *
 * Nota: las rutas con path literal (`/errores/agrupados`,
 * `/errores/reproceso-pendientes`) van declaradas ANTES de `/errores/:id`.
 */
@Controller()
export class ErroresController {
  constructor(private readonly service: ErroresService) {}

  // -------- Lectura --------

  /** Bandeja plana. GET /errores?empresa=&modulo=&estado=&responsableId=&soloAbiertos= */
  @Get('errores')
  listar(@Query() query: QueryErroresDto) {
    return this.service.listar(query);
  }

  /** Errores separados por empresa y por módulo. GET /errores/agrupados */
  @Get('errores/agrupados')
  agrupados(@Query() query: QueryErroresDto) {
    return this.service.agrupadoPorEmpresa(query);
  }

  /** Qué transacciones están esperando reproceso (para que n8n las levante). */
  @Get('errores/reproceso-pendientes')
  reprocesoPendientes() {
    return this.service.reprocesoPendientes();
  }

  /** Detalle de un error (incluye observaciones y trazabilidad). */
  @Get('errores/:id')
  detalle(@Param('id') id: string) {
    return this.service.detalle(id);
  }

  /** Empresas con al menos un error registrado. GET /empresas */
  @Get('empresas')
  empresas() {
    return this.service.empresas();
  }

  /** Métricas del dashboard. GET /dashboard/stats */
  @Get('dashboard/stats')
  dashboard() {
    return this.service.dashboard();
  }

  /** Asigna / desasigna responsable. PATCH /errores/:id/asignacion */
  @Patch('errores/:id/asignacion')
  asignar(@Param('id') id: string, @Body() dto: AsignarDto) {
    return this.service.asignar(id, dto);
  }

  /** Cambio manual de estado. PATCH /errores/:id/estado */
  @Patch('errores/:id/estado')
  cambiarEstado(@Param('id') id: string, @Body() dto: CambiarEstadoDto) {
    return this.service.cambiarEstado(id, dto);
  }

  /** Nueva observación. POST /errores/:id/observaciones */
  @Post('errores/:id/observaciones')
  observar(@Param('id') id: string, @Body() dto: CrearObservacionDto) {
    return this.service.agregarObservacion(id, dto);
  }

  /** Mandar a reprocesar (n8n pone status 'N' en Softland). POST /errores/:id/reproceso */
  @Post('errores/:id/reproceso')
  reprocesar(@Param('id') id: string, @Body() dto: SolicitarReprocesoDto) {
    return this.service.solicitarReproceso(id, dto);
  }
}
