import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegistroDto } from './dto/registro.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { UsuarioActual } from './usuario-actual.decorator';

/**
 * Registro y login. Devuelven `{ token, expiraEn, usuario }`; el front guarda el
 * token y lo manda como `Authorization: Bearer <token>` en el resto de la API.
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly service: AuthService) {}

  @Post('registro')
  registrar(@Body() dto: RegistroDto) {
    return this.service.registrar(dto);
  }

  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto) {
    return this.service.login(dto);
  }

  /** Datos frescos del usuario logueado (el front lo usa al recargar la página). */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@UsuarioActual('id') id: string) {
    return this.service.perfil(id);
  }
}
