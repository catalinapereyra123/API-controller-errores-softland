import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { generateKeyPairSync } from 'node:crypto';
import { desafioPkce, MicrosoftTokenService } from './microsoft-token.service';

const TENANT = '11111111-2222-3333-4444-555555555555';
const CLIENT = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const KID = 'clave-1';
const NONCE = 'nonce-1';
const REDIRECT = 'https://iris.iflow21.com/api/auth/microsoft/callback';

const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
});
const jwks = {
  keys: [{ ...publicKey.export({ format: 'jwk' }), kid: KID, use: 'sig' }],
};

const firmador = new JwtService();

/** ID token como lo emitiría Entra ID, con los claims pisables. */
function idToken(
  claims: Record<string, unknown> = {},
  opciones: { kid?: string; issuer?: string; audience?: string } = {},
): string {
  return firmador.sign(
    {
      oid: 'oid-123',
      tid: TENANT,
      name: 'Juan Pérez',
      preferred_username: 'Cata@IFlow.com',
      nonce: NONCE,
      ...claims,
    },
    {
      privateKey: privateKey.export({ type: 'pkcs8', format: 'pem' }),
      algorithm: 'RS256',
      keyid: opciones.kid ?? KID,
      issuer:
        opciones.issuer ?? `https://login.microsoftonline.com/${TENANT}/v2.0`,
      audience: opciones.audience ?? CLIENT,
      expiresIn: 300,
    },
  );
}

describe('MicrosoftTokenService', () => {
  const envOriginal = { ...process.env };
  let fetchMock: jest.Mock;

  beforeEach(() => {
    process.env.AZURE_TENANT_ID = TENANT;
    process.env.AZURE_CLIENT_ID = CLIENT;
    process.env.AZURE_CLIENT_SECRET = 'secreto';
    process.env.AZURE_REDIRECT_URI = REDIRECT;
    delete process.env.FRONTEND_URL;
    fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(jwks),
    });
    global.fetch = fetchMock;
  });

  afterEach(() => {
    process.env = { ...envOriginal };
  });

  it('acepta un token válido del tenant y normaliza el email', async () => {
    const service = new MicrosoftTokenService();

    await expect(service.verificar(idToken(), NONCE)).resolves.toEqual({
      oid: 'oid-123',
      email: 'cata@iflow.com',
      nombre: 'Juan Pérez',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      `https://login.microsoftonline.com/${TENANT}/discovery/v2.0/keys`,
    );
  });

  it('reusa las claves bajadas', async () => {
    const service = new MicrosoftTokenService();
    await service.verificar(idToken(), NONCE);
    await service.verificar(idToken(), NONCE);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['otra audiencia (otra app)', idToken({}, { audience: 'otra-app' })],
    [
      'otro tenant',
      idToken(
        { tid: 'otro' },
        { issuer: 'https://login.microsoftonline.com/otro/v2.0' },
      ),
    ],
    ['una clave desconocida', idToken({}, { kid: 'clave-falsa' })],
    ['un token sin oid', idToken({ oid: undefined })],
    ['un nonce de otro login', idToken({ nonce: 'otro' })],
  ])('rechaza %s', async (_caso, token) => {
    const service = new MicrosoftTokenService();
    await expect(service.verificar(token, NONCE)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rechaza un token firmado con otra clave aunque reuse el kid', async () => {
    const otra = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const falso = firmador.sign(
      { oid: 'oid-123', tid: TENANT, preferred_username: 'x@iflow.com' },
      {
        privateKey: otra.privateKey.export({ type: 'pkcs8', format: 'pem' }),
        algorithm: 'RS256',
        keyid: KID,
        issuer: `https://login.microsoftonline.com/${TENANT}/v2.0`,
        audience: CLIENT,
      },
    );

    await expect(
      new MicrosoftTokenService().verificar(falso, NONCE),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('sin configuración el SSO queda apagado', async () => {
    delete process.env.AZURE_TENANT_ID;
    const service = new MicrosoftTokenService();

    expect(service.configuracion).toBeNull();
    await expect(service.verificar(idToken(), NONCE)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('sin el client secret el SSO queda apagado (fuera de producción)', () => {
    delete process.env.AZURE_CLIENT_SECRET;
    expect(new MicrosoftTokenService().configuracion).toBeNull();
  });

  it('en producción una config a medias no deja arrancar', () => {
    delete process.env.AZURE_CLIENT_SECRET;
    process.env.NODE_ENV = 'production';
    expect(() => new MicrosoftTokenService()).toThrow(/AZURE_CLIENT_SECRET/);
  });

  it('por defecto sólo deja entrar cuentas @iflow21.com', () => {
    delete process.env.AZURE_DOMINIOS_PERMITIDOS;
    expect(
      new MicrosoftTokenService().configuracion?.dominiosPermitidos,
    ).toEqual(['iflow21.com']);
    process.env.AZURE_DOMINIOS_PERMITIDOS = ' @IFlow21.com , iflow.com.ar ';
    expect(
      new MicrosoftTokenService().configuracion?.dominiosPermitidos,
    ).toEqual(['iflow21.com', 'iflow.com.ar']);
  });

  it('el front es el dominio de la Redirect URI salvo que se pise', () => {
    expect(new MicrosoftTokenService().configuracion?.urlFront).toBe(
      'https://iris.iflow21.com',
    );
    process.env.FRONTEND_URL = 'http://localhost:5173/';
    expect(new MicrosoftTokenService().configuracion?.urlFront).toBe(
      'http://localhost:5173',
    );
  });

  it('arma la URL de Microsoft con state, nonce y PKCE, sin el secret', () => {
    const url = new URL(
      new MicrosoftTokenService().urlAutorizacion('st', 'no', 'verif'),
    );

    expect(url.origin + url.pathname).toBe(
      `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/authorize`,
    );
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      client_id: CLIENT,
      response_type: 'code',
      redirect_uri: REDIRECT,
      state: 'st',
      nonce: 'no',
      code_challenge: desafioPkce('verif'),
      code_challenge_method: 'S256',
    });
    expect(url.toString()).not.toContain('secreto');
  });

  it('canjea el code con el secret y devuelve el ID token', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ id_token: 'el-id-token' }),
    });

    await expect(
      new MicrosoftTokenService().canjearCodigo('el-code', 'verif'),
    ).resolves.toBe('el-id-token');

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/token`,
    );
    expect(
      Object.fromEntries(new URLSearchParams(init.body as string)),
    ).toMatchObject({
      client_id: CLIENT,
      client_secret: 'secreto',
      grant_type: 'authorization_code',
      code: 'el-code',
      redirect_uri: REDIRECT,
      code_verifier: 'verif',
    });
  });

  it('si Microsoft rechaza el canje no deja entrar', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: () =>
        Promise.resolve({
          error: 'invalid_client',
          error_description: 'AADSTS7000215: Invalid client secret provided.',
        }),
    });

    await expect(
      new MicrosoftTokenService().canjearCodigo('el-code', 'verif'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
