import {
  Body,
  Controller,
  Get,
  HttpCode,
  Logger,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { CookieOptions, Request, Response } from 'express';
import {
  AuthService,
  CANJE_VIDA_SEGUNDOS,
  COOKIE_CANJE_MICROSOFT,
  COOKIE_LOGIN_MICROSOFT,
  FalloLoginMicrosoft,
  LOGIN_MICROSOFT_VIDA_SEGUNDOS,
  type CallbackMicrosoft,
} from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegistroDto } from './dto/registro.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { MicrosoftTokenService } from './microsoft-token.service';
import { UsuarioActual } from './usuario-actual.decorator';

/**
 * Registro, login y login con Microsoft. Devuelven `{ token, expiraEn, usuario }`; el front guarda el
 * token y lo manda como `Authorization: Bearer <token>` en el resto de la API.
 *
 * SSO (app "Web" de Azure, con client secret):
 *   1. el botón del front navega a GET /auth/microsoft/login → Microsoft;
 *   2. Microsoft vuelve a GET /auth/microsoft/callback (la Redirect URI);
 *   3. el callback deja el código de un solo uso en una cookie y manda al
 *      front con `?ms=ok` (o `?ms_error=<motivo>`);
 *   4. el front pide la sesión a POST /auth/microsoft/sesion (con la cookie).
 */
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly service: AuthService,
    private readonly microsoft: MicrosoftTokenService,
  ) {}

  @Post('registro')
  registrar(@Body() dto: RegistroDto) {
    return this.service.registrar(dto);
  }

  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto) {
    return this.service.login(dto);
  }

  /** Si el SSO está prendido (el front muestra sólo el botón de Microsoft). */
  @Get('microsoft/config')
  configMicrosoft() {
    return { microsoft: this.microsoft.configuracion !== null };
  }

  @Get('microsoft/login')
  loginMicrosoft(@Res() res: Response) {
    const { url, cookie } = this.service.iniciarLoginMicrosoft();
    res.cookie(COOKIE_LOGIN_MICROSOFT, cookie, {
      ...this.opcionesCookie(),
      maxAge: LOGIN_MICROSOFT_VIDA_SEGUNDOS * 1000,
    });
    res.redirect(url);
  }

  @Get('microsoft/callback')
  async callbackMicrosoft(
    @Query() query: CallbackMicrosoft,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const urlFront = this.microsoft.configuracion?.urlFront ?? '';
    res.clearCookie(COOKIE_LOGIN_MICROSOFT, this.opcionesCookie());

    try {
      const codigo = await this.service.completarLoginMicrosoft(
        query,
        leerCookie(req, COOKIE_LOGIN_MICROSOFT),
      );
      res.cookie(COOKIE_CANJE_MICROSOFT, codigo, {
        ...this.opcionesCookie(),
        maxAge: CANJE_VIDA_SEGUNDOS * 1000,
      });
      res.redirect(`${urlFront}/?ms=ok`);
    } catch (error) {
      if (typeof query.error_description === 'string') {
        this.logger.warn(`Microsoft devolvió: ${query.error_description}`);
      }
      const motivo =
        error instanceof FalloLoginMicrosoft ? error.motivo : 'fallo';
      if (!(error instanceof FalloLoginMicrosoft)) {
        this.logger.error(
          `Falló el callback de Microsoft: ${(error as Error).message}`,
        );
      }
      res.redirect(`${urlFront}/?ms_error=${motivo}`);
    }
  }

  /** Entrega la sesión al navegador que tiene la cookie del callback (una vez). */
  @Post('microsoft/sesion')
  @HttpCode(200)
  sesionMicrosoft(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    res.clearCookie(COOKIE_CANJE_MICROSOFT, this.opcionesCookie());
    return this.service.canjearSesionMicrosoft(
      leerCookie(req, COOKIE_CANJE_MICROSOFT),
    );
  }

  /** Datos frescos del usuario logueado (el front lo usa al recargar la página). */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@UsuarioActual('id') id: string) {
    return this.service.perfil(id);
  }

  /**
   * Path `/` porque el navegador ve la API bajo `/api` y Nest no lo sabe.
   * `lax` deja que la cookie viaje en la vuelta desde Microsoft (es un GET de
   * navegación normal) y en el POST del front (mismo sitio).
   */
  private opcionesCookie(): CookieOptions {
    const redirect = this.microsoft.configuracion?.redirectUri ?? '';
    return {
      httpOnly: true,
      sameSite: 'lax',
      secure: redirect.startsWith('https://'),
      path: '/',
    };
  }
}

/** Sin cookie-parser: sólo hacen falta un par de cookies. */
function leerCookie(req: Request, nombre: string): string | undefined {
  for (const parte of (req.headers.cookie ?? '').split(';')) {
    const [clave, ...valor] = parte.trim().split('=');
    if (clave === nombre) {
      try {
        return decodeURIComponent(valor.join('='));
      } catch {
        return undefined;
      }
    }
  }
  return undefined;
}
