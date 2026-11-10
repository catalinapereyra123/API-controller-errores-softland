import {
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Usuario } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService, FalloLoginMicrosoft, iniciales } from './auth.service';
import {
  ConfigMicrosoft,
  IdentidadMicrosoft,
  MicrosoftTokenService,
} from './microsoft-token.service';
import { PasswordService } from './password.service';

const SECRET = 'secreto-de-test';

function usuarioFalso(over: Partial<Usuario> = {}): Usuario {
  return {
    id: 'usr_1',
    email: 'cata@iflow.com',
    passwordHash: 'hash',
    microsoftOid: null,
    nombre: 'Juan Pérez',
    rol: 'Soporte funcional',
    avatarIniciales: 'JP',
    createdAt: new Date(),
    ...over,
  };
}

describe('iniciales', () => {
  it('toma la primera letra del nombre y del apellido', () => {
    expect(iniciales('Juan Pérez')).toBe('JP');
  });

  it('usa las dos primeras letras si hay una sola palabra', () => {
    expect(iniciales('Juan')).toBe('JU');
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
      update: jest.Mock;
    }>,
    identidad?: IdentidadMicrosoft,
    configMicrosoft: ConfigMicrosoft | null = null,
  ) {
    const prisma = { usuario } as unknown as PrismaService;
    const microsoft = {
      verificar: jest.fn().mockResolvedValue(identidad),
      canjearCodigo: jest.fn().mockResolvedValue('id-token'),
      urlAutorizacion: jest
        .fn()
        .mockReturnValue('https://login.microsoftonline.com/x'),
      configuracion: configMicrosoft,
    } as unknown as MicrosoftTokenService;
    return new AuthService(prisma, jwt, passwords, microsoft);
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
        nombre: 'Juan Pérez',
      });

      const guardado = datosCreados(create);
      expect(guardado.passwordHash).not.toBe('contraseña-larga');
      await expect(
        passwords.coincide('contraseña-larga', guardado.passwordHash ?? ''),
      ).resolves.toBe(true);

      expect(sesion.usuario).toEqual({
        id: 'usr_1',
        email: 'cata@iflow.com',
        nombre: 'Juan Pérez',
        rol: 'Soporte funcional',
        avatarIniciales: 'JP',
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
          nombre: 'Juan Pérez',
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
      expect((errorSinUsuario as Error).message).toBe(
        (errorPasswordMal as Error).message,
      );
    });
  });

  /** Callback con la cookie correcta y canje del código, como hace el front. */
  async function entrarConMicrosoft(service: AuthService) {
    const codigo = await service.completarLoginMicrosoft(
      { code: 'el-code', state: 'st' },
      'st.no.verif',
    );
    return service.canjearSesionMicrosoft(codigo);
  }

  describe('login con Microsoft', () => {
    const identidad: IdentidadMicrosoft = {
      oid: 'oid-123',
      email: 'cata@iflow21.com',
      nombre: 'Juan Pérez',
    };

    /** Config con el filtro de dominio real (sólo @iflow21.com). */
    const configIflow: ConfigMicrosoft = {
      clientId: 'client',
      tenantId: 'tenant',
      clientSecret: 'secreto',
      redirectUri: 'https://iris.iflow21.com/api/auth/microsoft/callback',
      urlFront: 'https://iris.iflow21.com',
      dominiosPermitidos: ['iflow21.com'],
    };

    async function motivoDe(promesa: Promise<unknown>) {
      const error = await promesa.catch((e: unknown) => e);
      expect(error).toBeInstanceOf(FalloLoginMicrosoft);
      return (error as FalloLoginMicrosoft).motivo;
    }

    it('rechaza la vuelta si el state no es el de la cookie', async () => {
      const service = crearService({}, identidad);
      await expect(
        motivoDe(
          service.completarLoginMicrosoft(
            { code: 'c', state: 'de-otro' },
            'st.no.verif',
          ),
        ),
      ).resolves.toBe('vencido');
      await expect(
        motivoDe(
          service.completarLoginMicrosoft(
            { code: 'c', state: 'st' },
            undefined,
          ),
        ),
      ).resolves.toBe('vencido');
    });

    it('si Microsoft devuelve error no sigue', async () => {
      const service = crearService({}, identidad);
      await expect(
        motivoDe(
          service.completarLoginMicrosoft(
            { error: 'access_denied' },
            'st.no.verif',
          ),
        ),
      ).resolves.toBe('denegado');
    });

    it('rechaza cuentas de otro dominio (invitados del tenant)', async () => {
      const create = jest.fn();
      const service = crearService(
        { findUnique: jest.fn(), create },
        { ...identidad, email: 'consultor@otraempresa.com' },
        configIflow,
      );

      await expect(motivoDe(entrarConMicrosoft(service))).resolves.toBe(
        'dominio',
      );
      expect(create).not.toHaveBeenCalled();
    });

    it('el código de canje sirve una sola vez', async () => {
      const service = crearService(
        {
          findUnique: jest
            .fn()
            .mockResolvedValue(usuarioFalso({ microsoftOid: 'oid-123' })),
        },
        identidad,
        configIflow,
      );
      const codigo = await service.completarLoginMicrosoft(
        { code: 'el-code', state: 'st' },
        'st.no.verif',
      );

      expect(service.canjearSesionMicrosoft(codigo).usuario.id).toBe('usr_1');
      expect(() => service.canjearSesionMicrosoft(codigo)).toThrow(
        UnauthorizedException,
      );
      expect(() => service.canjearSesionMicrosoft(undefined)).toThrow(
        UnauthorizedException,
      );
    });

    it('entra directo si ya hay un usuario con ese Object ID', async () => {
      const update = jest.fn();
      const create = jest.fn();
      const service = crearService(
        {
          findUnique: jest
            .fn()
            .mockResolvedValue(usuarioFalso({ microsoftOid: 'oid-123' })),
          update,
          create,
        },
        identidad,
      );

      const sesion = await entrarConMicrosoft(service);

      expect(sesion.usuario.id).toBe('usr_1');
      expect(update).not.toHaveBeenCalled();
      expect(create).not.toHaveBeenCalled();
    });

    it('la primera vez vincula la cuenta existente con el mismo email', async () => {
      const update = jest
        .fn()
        .mockResolvedValue(usuarioFalso({ microsoftOid: 'oid-123' }));
      const service = crearService(
        {
          findUnique: jest
            .fn()
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce(usuarioFalso()),
          update,
        },
        identidad,
      );

      const sesion = await entrarConMicrosoft(service);

      expect(update).toHaveBeenCalledWith({
        where: { id: 'usr_1' },
        data: { microsoftOid: 'oid-123' },
      });
      expect(jwt.verify<{ sub: string }>(sesion.token).sub).toBe('usr_1');
    });

    it('si no existe, crea el usuario sin contraseña', async () => {
      const create = jest
        .fn()
        .mockResolvedValue(
          usuarioFalso({ microsoftOid: 'oid-123', passwordHash: null }),
        );
      const service = crearService(
        { findUnique: jest.fn().mockResolvedValue(null), create },
        identidad,
      );

      await entrarConMicrosoft(service);

      expect(create).toHaveBeenCalledWith({
        data: {
          email: 'cata@iflow21.com',
          microsoftOid: 'oid-123',
          nombre: 'Juan Pérez',
          avatarIniciales: 'JP',
        },
      });
    });

    it('no le entrega a otra persona una cuenta ya vinculada (email reasignado)', async () => {
      const update = jest.fn();
      const service = crearService(
        {
          findUnique: jest
            .fn()
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce(usuarioFalso({ microsoftOid: 'oid-viejo' })),
          update,
        },
        identidad,
      );

      await expect(motivoDe(entrarConMicrosoft(service))).resolves.toBe(
        'vinculada',
      );
      expect(update).not.toHaveBeenCalled();
    });

    it('un usuario sólo-Microsoft no puede entrar con contraseña', async () => {
      const service = crearService({
        findUnique: jest
          .fn()
          .mockResolvedValue(usuarioFalso({ passwordHash: null })),
      });

      await expect(
        service.login({ email: 'cata@iflow.com', password: 'lo-que-sea' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('con Azure configurado no se puede entrar con contraseña ni registrarse', async () => {
      const findUnique = jest.fn();
      const create = jest.fn();
      const service = crearService(
        { findUnique, create },
        undefined,
        configIflow,
      );

      await expect(
        service.login({
          email: 'cata@iflow.com',
          password: 'contraseña-larga',
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      await expect(
        service.registrar({
          email: 'cata@iflow.com',
          password: 'contraseña-larga',
          nombre: 'Juan Pérez',
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(findUnique).not.toHaveBeenCalled();
      expect(create).not.toHaveBeenCalled();
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
