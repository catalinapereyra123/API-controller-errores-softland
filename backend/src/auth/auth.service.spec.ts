import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Usuario } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService, iniciales } from './auth.service';
import { PasswordService } from './password.service';

const SECRET = 'secreto-de-test';

function usuarioFalso(over: Partial<Usuario> = {}): Usuario {
  return {
    id: 'usr_1',
    email: 'cata@iflow.com',
    passwordHash: 'hash',
    nombre: 'Catalina Weiss',
    rol: 'Soporte funcional',
    avatarIniciales: 'CW',
    createdAt: new Date(),
    ...over,
  };
}

describe('iniciales', () => {
  it('toma la primera letra del nombre y del apellido', () => {
    expect(iniciales('Catalina Weiss')).toBe('CW');
  });

  it('usa las dos primeras letras si hay una sola palabra', () => {
    expect(iniciales('Catalina')).toBe('CA');
  });

  it('ignora los espacios de más', () => {
    expect(iniciales('  Martín   Álvarez  ')).toBe('MÁ');
  });
});

describe('PasswordService', () => {
  const passwords = new PasswordService();

  it('genera un hash distinto para la misma contraseña (salt aleatorio)', async () => {
    const a = await passwords.hashear('contraseña-larga');
    const b = await passwords.hashear('contraseña-larga');
    expect(a).not.toBe(b);
  });

  it('acepta la contraseña correcta y rechaza la incorrecta', async () => {
    const hash = await passwords.hashear('contraseña-larga');
    await expect(passwords.coincide('contraseña-larga', hash)).resolves.toBe(
      true,
    );
    await expect(passwords.coincide('otra-cosa', hash)).resolves.toBe(false);
  });

  it('no explota si el hash guardado está corrupto', async () => {
    await expect(passwords.coincide('x', 'sin-separador')).resolves.toBe(false);
    await expect(passwords.coincide('x', 'salt:notahex')).resolves.toBe(false);
  });
});

/** Los datos que recibió prisma.usuario.create en la primera llamada. */
function datosCreados(create: jest.Mock): Usuario {
  const llamadas = create.mock.calls as Array<[{ data: Usuario }]>;
  return llamadas[0][0].data;
}

describe('AuthService', () => {
  const jwt = new JwtService({
    secret: SECRET,
    signOptions: { expiresIn: 60 },
  });
  const passwords = new PasswordService();

  function crearService(
    usuario: Partial<{
      findUnique: jest.Mock;
      create: jest.Mock;
    }>,
  ) {
    const prisma = { usuario } as unknown as PrismaService;
    return new AuthService(prisma, jwt, passwords);
  }

  describe('registrar', () => {
    it('crea el usuario con el hash y devuelve token + usuario sin passwordHash', async () => {
      const create = jest.fn().mockResolvedValue(usuarioFalso());
      const service = crearService({
        findUnique: jest.fn().mockResolvedValue(null),
        create,
      });

      const sesion = await service.registrar({
        email: 'cata@iflow.com',
        password: 'contraseña-larga',
        nombre: 'Catalina Weiss',
      });

      const guardado = datosCreados(create);
      expect(guardado.passwordHash).not.toBe('contraseña-larga');
      await expect(
        passwords.coincide('contraseña-larga', guardado.passwordHash),
      ).resolves.toBe(true);

      expect(sesion.usuario).toEqual({
        id: 'usr_1',
        email: 'cata@iflow.com',
        nombre: 'Catalina Weiss',
        rol: 'Soporte funcional',
        avatarIniciales: 'CW',
      });
      expect(jwt.verify<{ sub: string }>(sesion.token).sub).toBe('usr_1');
    });

    it('deriva las iniciales del nombre', async () => {
      const create = jest.fn().mockResolvedValue(usuarioFalso());
      const service = crearService({
        findUnique: jest.fn().mockResolvedValue(null),
        create,
      });

      await service.registrar({
        email: 'martin@iflow.com',
        password: 'contraseña-larga',
        nombre: 'Martín Álvarez',
      });

      expect(datosCreados(create).avatarIniciales).toBe('MÁ');
    });

    it('rechaza un email ya registrado', async () => {
      const service = crearService({
        findUnique: jest.fn().mockResolvedValue({ id: 'usr_1' }),
        create: jest.fn(),
      });

      await expect(
        service.registrar({
          email: 'cata@iflow.com',
          password: 'contraseña-larga',
          nombre: 'Catalina Weiss',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('login', () => {
    it('devuelve la sesión cuando la contraseña coincide', async () => {
      const passwordHash = await passwords.hashear('contraseña-larga');
      const service = crearService({
        findUnique: jest.fn().mockResolvedValue(usuarioFalso({ passwordHash })),
      });

      const sesion = await service.login({
        email: 'cata@iflow.com',
        password: 'contraseña-larga',
      });

      expect(sesion.usuario.id).toBe('usr_1');
      expect(sesion.expiraEn).toBeGreaterThan(0);
    });

    it('da el mismo error con email inexistente que con contraseña incorrecta', async () => {
      const passwordHash = await passwords.hashear('contraseña-larga');
      const sinUsuario = crearService({
        findUnique: jest.fn().mockResolvedValue(null),
      });
      const conUsuario = crearService({
        findUnique: jest.fn().mockResolvedValue(usuarioFalso({ passwordHash })),
      });

      const errorSinUsuario = await sinUsuario
        .login({ email: 'nadie@iflow.com', password: 'contraseña-larga' })
        .catch((e: Error) => e);
      const errorPasswordMal = await conUsuario
        .login({ email: 'cata@iflow.com', password: 'incorrecta' })
        .catch((e: Error) => e);

      expect(errorSinUsuario).toBeInstanceOf(UnauthorizedException);
      expect(errorPasswordMal).toBeInstanceOf(UnauthorizedException);
      expect(errorSinUsuario.message).toBe(errorPasswordMal.message);
    });
  });

  describe('perfil', () => {
    it('falla si el usuario del token ya no existe', async () => {
      const service = crearService({
        findUnique: jest.fn().mockResolvedValue(null),
      });

      await expect(service.perfil('usr_borrado')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });
});
