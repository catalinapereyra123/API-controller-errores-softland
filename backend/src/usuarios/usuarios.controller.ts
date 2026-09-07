import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsuariosService } from './usuarios.service';

/**
 * Usuarios de la app. El perfil de la sesión vive en `GET /auth/me`;
 * acá sólo se listan los que pueden ser responsables de un error.
 */
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsuariosController {
  constructor(private readonly service: UsuariosService) {}

  /** GET /users — usuarios que pueden ser responsables. */
  @Get()
  listar() {
    return this.service.listar();
  }
}
