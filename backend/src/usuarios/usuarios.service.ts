import { Injectable } from '@nestjs/common';
import type { Usuario } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

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
}
