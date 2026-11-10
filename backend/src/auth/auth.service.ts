import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomBytes } from 'node:crypto';
import type { Usuario } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegistroDto } from './dto/registro.dto';
import { SesionDto, UsuarioDto } from './dto/sesion.dto';
import {
  type IdentidadMicrosoft,
  MicrosoftTokenService,
} from './microsoft-token.service';
import { PasswordService } from './password.service';

/** Vida del token. Se expone en la respuesta para que el front sepa cuándo expira. */
export const TOKEN_EXPIRA_EN_SEGUNDOS = 60 * 60 * 8; // 8 h

/** Cookie que ata el ida y vuelta a Microsoft a este navegador. */
export const COOKIE_LOGIN_MICROSOFT = 'iris_ms_login';
/** Tiempo para elegir la cuenta en Microsoft y volver. */
export const LOGIN_MICROSOFT_VIDA_SEGUNDOS = 10 * 60;
/**
 * Cookie con el código de un solo uso para pedir la sesión. Va en cookie (no
 * en la URL) para que nadie pueda pasarle a otro un link que lo loguee como él.
 */
export const COOKIE_CANJE_MICROSOFT = 'iris_ms_canje';
/** El front canjea el código apenas vuelve: con un minuto sobra. */
export const CANJE_VIDA_SEGUNDOS = 60;

/**
 * Por qué falló el ingreso. Viaja en `?ms_error=` y el front lo traduce a un
 * texto fijo (así nadie puede armar un link que muestre un mensaje inventado).
 */
export type MotivoFalloMicrosoft =
  'denegado' | 'vencido' | 'dominio' | 'vinculada' | 'fallo';

export class FalloLoginMicrosoft extends Error {
  constructor(readonly motivo: MotivoFalloMicrosoft) {
    super(`Ingreso con Microsoft rechazado: ${motivo}`);
  }
}

/** Lo que llega de Microsoft en la query del callback. */
export interface CallbackMicrosoft {
  code?: string;
  state?: string;
  error?: string;
  error_description?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  /**
   * Códigos de un solo uso del callback de Microsoft. En memoria: hay una sola
   * instancia del backend y viven un minuto (si se reinicia, se vuelve a entrar).
   */
  private readonly canjes = new Map<
    string,
    { sesion: SesionDto; vence: number }
  >();

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly passwords: PasswordService,
    private readonly microsoft: MicrosoftTokenService,
  ) {}

  async registrar(dto: RegistroDto): Promise<SesionDto> {
    this.rechazarSiHayMicrosoft();
    await this.rechazarSiEmailExiste(dto.email);

    const usuario = await this.prisma.usuario.create({
      data: {
        email: dto.email,
        passwordHash: await this.passwords.hashear(dto.password),
        nombre: dto.nombre,
        avatarIniciales: iniciales(dto.nombre),
        ...(dto.rol ? { rol: dto.rol } : {}),
      },
    });

    return this.armarSesion(usuario);
  }

  async login(dto: LoginDto): Promise<SesionDto> {
    this.rechazarSiHayMicrosoft();
    const usuario = await this.prisma.usuario.findUnique({
      where: { email: dto.email },
    });

    // Mismo error para email inexistente, contraseña incorrecta y cuenta que
    // sólo entra con Microsoft: no se le confirma a nadie qué emails existen.
    if (
      !usuario?.passwordHash ||
      !(await this.passwords.coincide(dto.password, usuario.passwordHash))
    ) {
      throw new UnauthorizedException('Email o contraseña incorrectos.');
    }

    return this.armarSesion(usuario);
  }

  /**
   * Con el SSO configurado se entra sólo con la cuenta corporativa. Email y
   * contraseña quedan para cuando no hay Azure (local, o antes del deploy).
   */
  private rechazarSiHayMicrosoft(): void {
    if (this.microsoft.configuracion) {
      throw new ForbiddenException(
        'Ingresá con tu cuenta de Microsoft de la empresa.',
      );
    }
  }

  /**
   * GET /auth/microsoft/login — arma la URL de Microsoft y el valor de la
   * cookie (`state.nonce.verificador`) que el callback va a exigir.
   */
  iniciarLoginMicrosoft(): { url: string; cookie: string } {
    const state = aleatorio();
    const nonce = aleatorio();
    const verificador = aleatorio(48);
    return {
      url: this.microsoft.urlAutorizacion(state, nonce, verificador),
      cookie: [state, nonce, verificador].join('.'),
    };
  }

  /**
   * GET /auth/microsoft/callback — valida que la vuelta sea la que inició este
   * navegador, canjea el code por el ID token, busca o crea al usuario y
   * devuelve un código de un solo uso (el controller lo deja en una cookie)
   * para que el front pida la sesión sin que el JWT viaje en la URL.
   *
   * Sólo entran cuentas del tenant configurado con email de un dominio
   * permitido (los invitados de otras empresas quedan afuera).
   */
  async completarLoginMicrosoft(
    query: CallbackMicrosoft,
    cookie: string | undefined,
  ): Promise<string> {
    if (query.error) {
      throw new FalloLoginMicrosoft(
        query.error === 'access_denied' ? 'denegado' : 'fallo',
      );
    }

    const [state, nonce, verificador] = (cookie ?? '').split('.');
    if (
      !query.code ||
      !query.state ||
      !state ||
      !nonce ||
      !verificador ||
      query.state !== state
    ) {
      throw new FalloLoginMicrosoft('vencido');
    }

    const idToken = await this.microsoft.canjearCodigo(query.code, verificador);
    const identidad = await this.microsoft.verificar(idToken, nonce);

    const dominios = this.microsoft.configuracion?.dominiosPermitidos ?? [];
    const dominio = identidad.email.split('@').pop() ?? '';
    if (dominios.length && !dominios.includes(dominio)) {
      throw new FalloLoginMicrosoft('dominio');
    }

    const usuario = await this.usuarioDeMicrosoft(identidad);
    const sesion = await this.armarSesion(usuario);
    const codigo = aleatorio();
    this.purgarCanjesVencidos();
    this.canjes.set(codigo, {
      sesion,
      vence: Date.now() + CANJE_VIDA_SEGUNDOS * 1000,
    });
    return codigo;
  }

  /**
   * Busca al usuario por su Object ID de Entra ID. La primera vez lo vincula a
   * la cuenta con el mismo email (si no estaba vinculada a otra cuenta de
   * Microsoft) o lo crea sin contraseña.
   */
  private async usuarioDeMicrosoft(
    identidad: IdentidadMicrosoft,
  ): Promise<Usuario> {
    const porOid = await this.prisma.usuario.findUnique({
      where: { microsoftOid: identidad.oid },
    });
    if (porOid) return porOid;

    const porEmail = await this.prisma.usuario.findUnique({
      where: { email: identidad.email },
    });
    if (porEmail) {
      // El email ya es de otra cuenta de Microsoft (casilla reasignada a otra
      // persona): no se le entrega la cuenta, el historial ni el rol del anterior.
      if (porEmail.microsoftOid) {
        this.logger.warn(
          `${identidad.email} ya está vinculado a otro usuario de Microsoft: se rechaza el ingreso.`,
        );
        throw new FalloLoginMicrosoft('vinculada');
      }
      return this.prisma.usuario.update({
        where: { id: porEmail.id },
        data: { microsoftOid: identidad.oid },
      });
    }

    return this.prisma.usuario.create({
      data: {
        email: identidad.email,
        microsoftOid: identidad.oid,
        nombre: identidad.nombre,
        avatarIniciales: iniciales(identidad.nombre),
      },
    });
  }

  /** POST /auth/microsoft/sesion — entrega la sesión una sola vez. */
  canjearSesionMicrosoft(codigo: string | undefined): SesionDto {
    const canje = codigo ? this.canjes.get(codigo) : undefined;
    if (codigo) this.canjes.delete(codigo);
    if (!canje || canje.vence < Date.now()) {
      throw new UnauthorizedException(
        'El ingreso con Microsoft venció. Probá de nuevo.',
      );
    }
    return canje.sesion;
  }

  private purgarCanjesVencidos(): void {
    const ahora = Date.now();
    for (const [codigo, canje] of this.canjes) {
      if (canje.vence < ahora) this.canjes.delete(codigo);
    }
  }

  /** GET /auth/me — datos frescos del usuario del token. */
  async perfil(id: string): Promise<UsuarioDto> {
    const usuario = await this.prisma.usuario.findUnique({ where: { id } });
    if (!usuario) throw new UnauthorizedException('La sesión ya no es válida.');
    return toUsuarioDto(usuario);
  }

  private async rechazarSiEmailExiste(email: string): Promise<void> {
    const existe = await this.prisma.usuario.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existe) throw new ConflictException('Ese email ya está registrado.');
  }

  private async armarSesion(usuario: Usuario): Promise<SesionDto> {
    const token = await this.jwt.signAsync({
      sub: usuario.id,
      email: usuario.email,
      nombre: usuario.nombre,
    });

    return {
      token,
      expiraEn: TOKEN_EXPIRA_EN_SEGUNDOS,
      usuario: toUsuarioDto(usuario),
    };
  }
}

export function toUsuarioDto(usuario: Usuario): UsuarioDto {
  return {
    id: usuario.id,
    email: usuario.email,
    nombre: usuario.nombre,
    rol: usuario.rol,
    avatarIniciales: usuario.avatarIniciales,
  };
}

function aleatorio(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

/** "Juan Pérez" -> "JP"; "Juan" -> "JU". */
export function iniciales(nombre: string): string {
  const palabras = nombre.trim().split(/\s+/).filter(Boolean);
  if (palabras.length === 0) return '??';
  if (palabras.length === 1) return palabras[0].slice(0, 2).toUpperCase();
  return (palabras[0][0] + palabras[palabras.length - 1][0]).toUpperCase();
}
