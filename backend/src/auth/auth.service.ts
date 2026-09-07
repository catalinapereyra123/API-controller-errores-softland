import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Usuario } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegistroDto } from './dto/registro.dto';
import { SesionDto, UsuarioDto } from './dto/sesion.dto';
import { PasswordService } from './password.service';

/** Vida del token. Se expone en la respuesta para que el front sepa cuándo expira. */
export const TOKEN_EXPIRA_EN_SEGUNDOS = 60 * 60 * 8; // 8 h

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly passwords: PasswordService,
  ) {}

  async registrar(dto: RegistroDto): Promise<SesionDto> {
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
    const usuario = await this.prisma.usuario.findUnique({
      where: { email: dto.email },
    });

    // Mismo error para email inexistente y contraseña incorrecta: no se le
    // confirma a nadie qué emails están registrados.
    if (
      !usuario ||
      !(await this.passwords.coincide(dto.password, usuario.passwordHash))
    ) {
      throw new UnauthorizedException('Email o contraseña incorrectos.');
    }

    return this.armarSesion(usuario);
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

/** "Catalina Weiss" -> "CW"; "Catalina" -> "CA". */
export function iniciales(nombre: string): string {
  const palabras = nombre.trim().split(/\s+/).filter(Boolean);
  if (palabras.length === 0) return '??';
  if (palabras.length === 1) return palabras[0].slice(0, 2).toUpperCase();
  return (palabras[0][0] + palabras[palabras.length - 1][0]).toUpperCase();
}
