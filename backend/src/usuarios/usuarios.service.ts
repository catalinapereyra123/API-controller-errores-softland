import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { Usuario } from '../../generated/prisma/client';

const toDto = (u: Usuario) => ({
  id: u.id,
  nombre: u.nombre,
  rol: u.rol,
  avatarIniciales: u.avatarIniciales,
});

@Injectable()
export class UsuariosService {
  constructor(private readonly prisma: PrismaService) {}

  async listar() {
    const usuarios = await this.prisma.usuario.findMany({
      orderBy: { nombre: 'asc' },
    });
    return usuarios.map(toDto);
  }

  /**
   * Usuario de la sesión activa. Provisorio hasta que haya auth.
   * Devuelve null si todavía no hay usuarios cargados: la app funciona igual
   * (las acciones quedan registradas como "Sistema").
   */
  async actual() {
    const usuario =
      (await this.prisma.usuario.findFirst({ where: { esActual: true } })) ??
      (await this.prisma.usuario.findFirst({ orderBy: { nombre: 'asc' } }));

    return usuario ? toDto(usuario) : null;
  }
}
