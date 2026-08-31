import { Controller, Get } from '@nestjs/common';
import { UsuariosService } from './usuarios.service';

@Controller('users')
export class UsuariosController {
  constructor(private readonly service: UsuariosService) {}

  /** GET /users/me — usuario de la sesión activa. */
  @Get('me')
  me() {
    return this.service.actual();
  }

  /** GET /users — usuarios que pueden ser responsables. */
  @Get()
  listar() {
    return this.service.listar();
  }
}
