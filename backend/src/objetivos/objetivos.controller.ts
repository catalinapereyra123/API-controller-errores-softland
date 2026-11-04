import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import type { UsuarioAutenticado } from '../auth/dto/sesion.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsuarioActual } from '../auth/usuario-actual.decorator';
import { ActualizarObjetivoDto, CrearObjetivoDto } from './dto/objetivos.dto';
import { ObjetivosService } from './objetivos.service';

/**
 * North Star y KR de la pantalla Objetivos. Cada cambio devuelve la lista
 * entera recalculada: el front la reemplaza tal cual.
 */
@Controller('objetivos')
@UseGuards(JwtAuthGuard)
export class ObjetivosController {
  constructor(private readonly service: ObjetivosService) {}

  /** GET /objetivos — catálogo de indicadores + métricas con su valor actual. */
  @Get()
  listar() {
    return this.service.listar();
  }

  /** POST /objetivos/propuesta — la NSM y los KR sugeridos (sólo si no hay nada). */
  @Post('propuesta')
  propuesta(@UsuarioActual() usuario: UsuarioAutenticado) {
    return this.service.cargarPropuesta(usuario);
  }

  /** POST /objetivos — nueva NSM o KR. */
  @Post()
  crear(
    @Body() dto: CrearObjetivoDto,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    return this.service.crear(dto, usuario);
  }

  /** PATCH /objetivos/:id — editar, cambiar la meta o activar / pausar. */
  @Patch(':id')
  actualizar(@Param('id') id: string, @Body() dto: ActualizarObjetivoDto) {
    return this.service.actualizar(id, dto);
  }

  /** POST /objetivos/pausar-todo — pausa la NSM y los KR sin borrarlos. */
  @Post('pausar-todo')
  pausarTodo() {
    return this.service.pausarTodo();
  }

  /** DELETE /objetivos — borra la NSM y todos los KR. */
  @Delete()
  borrarTodo() {
    return this.service.borrarTodo();
  }

  /** DELETE /objetivos/:id */
  @Delete(':id')
  borrar(@Param('id') id: string) {
    return this.service.borrar(id);
  }
}
