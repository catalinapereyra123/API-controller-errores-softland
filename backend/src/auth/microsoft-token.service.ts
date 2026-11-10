import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, createPublicKey, type JsonWebKey } from 'node:crypto';

/**
 * Datos del App registration de Azure (plataforma "Web"). El secret nunca
 * sale del backend.
 */
export interface ConfigMicrosoft {
  clientId: string;
  tenantId: string;
  clientSecret: string;
  /** Tiene que coincidir letra por letra con la Redirect URI cargada en Azure. */
  redirectUri: string;
  /** A dónde vuelve la persona después del login (el front). */
  urlFront: string;
  /** Dominios de email que pueden entrar (vacío = cualquiera del tenant). */
  dominiosPermitidos: string[];
}

/** Identidad que sale de un ID token de Microsoft ya validado. */
export interface IdentidadMicrosoft {
  /** Object ID del usuario en Entra ID: no cambia aunque cambie el email. */
  oid: string;
  email: string;
  nombre: string;
}

interface ClaimsIdToken {
  oid?: string;
  tid?: string;
  name?: string;
  email?: string;
  preferred_username?: string;
  nonce?: string;
}

interface JwkMicrosoft extends JsonWebKey {
  kid?: string;
}

interface RespuestaToken {
  id_token?: string;
  error?: string;
  error_description?: string;
}

const SCOPES = 'openid profile email';

/** Si una firma trae un `kid` desconocido no se vuelve a pedir el JWKS antes de esto. */
const ESPERA_MINIMA_REFRESCO_MS = 5 * 60 * 1000;

/**
 * Login con Microsoft Entra ID (cuenta de Outlook corporativo) por el flujo
 * "authorization code" de una app Web: el navegador va a Microsoft, vuelve a
 * nuestro callback con un `code` y el backend lo canjea (con el client secret)
 * por el ID token.
 *
 * El ID token se valida igual: firma (claves públicas del tenant), audiencia
 * (nuestro client id), emisor (sólo nuestro tenant), vencimiento y nonce.
 * Si falta alguna variable AZURE_* el SSO queda apagado y el front muestra
 * email y contraseña.
 */
@Injectable()
export class MicrosoftTokenService {
  private readonly logger = new Logger(MicrosoftTokenService.name);
  /** Instancia propia: la global está configurada con el secreto de nuestros JWT. */
  private readonly jwt = new JwtService();
  private readonly config: ConfigMicrosoft | null = leerConfig(this.logger);

  private claves = new Map<string, string>();
  private ultimoRefresco = 0;

  get configuracion(): ConfigMicrosoft | null {
    return this.config;
  }

  /** URL de Microsoft a la que se manda el navegador para elegir la cuenta. */
  urlAutorizacion(state: string, nonce: string, verificador: string): string {
    const { clientId, tenantId, redirectUri } = this.exigirConfig();
    const params = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      redirect_uri: redirectUri,
      response_mode: 'query',
      scope: SCOPES,
      state,
      nonce,
      code_challenge: desafioPkce(verificador),
      code_challenge_method: 'S256',
      prompt: 'select_account',
    });
    return `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?${params.toString()}`;
  }

  /** Canjea el `code` del callback por el ID token (acá se usa el secret). */
  async canjearCodigo(code: string, verificador: string): Promise<string> {
    const { clientId, tenantId, clientSecret, redirectUri } =
      this.exigirConfig();

    const res = await fetch(
      `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
          code_verifier: verificador,
          scope: SCOPES,
        }).toString(),
      },
    );

    const datos = (await res.json().catch(() => ({}))) as RespuestaToken;
    if (!res.ok || !datos.id_token) {
      // Ej.: AADSTS7000215 = el client secret está mal o venció.
      this.logger.error(
        `Microsoft rechazó el canje del code (${res.status}): ${datos.error ?? ''} ${datos.error_description ?? ''}`.trim(),
      );
      throw new UnauthorizedException(
        'No pudimos iniciar sesión con Microsoft.',
      );
    }
    return datos.id_token;
  }

  async verificar(
    idToken: string,
    nonceEsperado: string,
  ): Promise<IdentidadMicrosoft> {
    const { clientId, tenantId } = this.exigirConfig();

    const kid = this.kidDe(idToken);
    const clave = await this.clavePublica(kid);

    let claims: ClaimsIdToken;
    try {
      claims = await this.jwt.verifyAsync<ClaimsIdToken>(idToken, {
        secret: clave,
        algorithms: ['RS256'],
        audience: clientId,
        issuer: `https://login.microsoftonline.com/${tenantId}/v2.0`,
      });
    } catch (error) {
      this.logger.warn(
        `ID token de Microsoft rechazado: ${(error as Error).message}`,
      );
      throw new UnauthorizedException(
        'No pudimos validar tu cuenta de Microsoft.',
      );
    }

    if (claims.nonce !== nonceEsperado) {
      this.logger.warn(
        'ID token de Microsoft con un nonce que no es el nuestro.',
      );
      throw new UnauthorizedException(
        'No pudimos validar tu cuenta de Microsoft.',
      );
    }

    const email = (claims.email ?? claims.preferred_username ?? '')
      .trim()
      .toLowerCase();
    if (!claims.oid || claims.tid !== tenantId || !email) {
      throw new UnauthorizedException(
        'La cuenta de Microsoft no trae los datos necesarios.',
      );
    }

    return {
      oid: claims.oid,
      email,
      nombre: claims.name?.trim() || email.split('@')[0],
    };
  }

  private exigirConfig(): ConfigMicrosoft {
    if (!this.config) {
      throw new UnauthorizedException(
        'El ingreso con Microsoft no está configurado.',
      );
    }
    return this.config;
  }

  private kidDe(idToken: string): string {
    const decodificado = this.jwt.decode<{ header?: { kid?: string } } | null>(
      idToken,
      { complete: true },
    );
    const kid = decodificado?.header?.kid;
    if (!kid) {
      throw new UnauthorizedException('El token de Microsoft no es válido.');
    }
    return kid;
  }

  /** PEM de la clave con ese `kid`. Microsoft rota las claves: si no está, se refresca. */
  private async clavePublica(kid: string): Promise<string> {
    const enCache = this.claves.get(kid);
    if (enCache) return enCache;

    if (Date.now() - this.ultimoRefresco > ESPERA_MINIMA_REFRESCO_MS) {
      await this.refrescarClaves();
    }

    const clave = this.claves.get(kid);
    if (!clave) {
      throw new UnauthorizedException('El token de Microsoft no es válido.');
    }
    return clave;
  }

  private async refrescarClaves(): Promise<void> {
    const url = `https://login.microsoftonline.com/${this.config!.tenantId}/discovery/v2.0/keys`;
    const res = await fetch(url);
    if (!res.ok) {
      this.logger.error(
        `No se pudieron bajar las claves de Microsoft (${res.status}).`,
      );
      throw new UnauthorizedException(
        'No pudimos contactar a Microsoft. Probá de nuevo en un rato.',
      );
    }

    const { keys } = (await res.json()) as { keys: JwkMicrosoft[] };
    const claves = new Map<string, string>();
    for (const jwk of keys) {
      if (!jwk.kid || jwk.kty !== 'RSA') continue;
      const pem = createPublicKey({ key: jwk, format: 'jwk' })
        .export({ type: 'spki', format: 'pem' })
        .toString();
      claves.set(jwk.kid, pem);
    }

    this.claves = claves;
    this.ultimoRefresco = Date.now();
  }
}

/** PKCE S256: base64url(sha256(verificador)). */
export function desafioPkce(verificador: string): string {
  return createHash('sha256').update(verificador).digest('base64url');
}

const VARIABLES = [
  'AZURE_TENANT_ID',
  'AZURE_CLIENT_ID',
  'AZURE_CLIENT_SECRET',
  'AZURE_REDIRECT_URI',
] as const;

/** Sin AZURE_DOMINIOS_PERMITIDOS sólo entran cuentas @iflow21.com. */
const DOMINIOS_POR_DEFECTO = 'iflow21.com';

function leerConfig(logger: Logger): ConfigMicrosoft | null {
  const valores = VARIABLES.map((nombre) => process.env[nombre]?.trim() ?? '');
  const faltan = VARIABLES.filter((_, i) => !valores[i]);
  if (faltan.length === VARIABLES.length) return null;

  const [tenantId, clientId, clientSecret, redirectUri] = valores;
  let urlFront = process.env.FRONTEND_URL?.trim();
  let problema = faltan.length ? `faltan ${faltan.join(', ')}` : null;
  if (!problema && !urlFront) {
    try {
      // En prod el back vive en el mismo dominio que el front (bajo /api).
      urlFront = new URL(redirectUri).origin;
    } catch {
      problema = 'AZURE_REDIRECT_URI no es una URL';
    }
  }

  if (problema) {
    // En producción, una config a medias apagaría el SSO y reabriría el
    // login con contraseña y el registro: mejor no arrancar.
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`SSO con Microsoft mal configurado: ${problema}.`);
    }
    logger.warn(`SSO con Microsoft apagado: ${problema}.`);
    return null;
  }

  const dominiosPermitidos = (
    process.env.AZURE_DOMINIOS_PERMITIDOS ?? DOMINIOS_POR_DEFECTO
  )
    .split(',')
    .map((d) => d.trim().toLowerCase().replace(/^@/, ''))
    .filter(Boolean);

  return {
    tenantId,
    clientId,
    clientSecret,
    redirectUri,
    urlFront: urlFront!.replace(/\/$/, ''),
    dominiosPermitidos,
  };
}
