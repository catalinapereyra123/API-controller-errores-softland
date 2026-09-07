import { Injectable } from '@nestjs/common';
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

const LARGO_CLAVE = 64;
const SEPARADOR = ':';

/** scrypt con promesa (la versión de node:util pierde los tipos). */
function derivar(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, LARGO_CLAVE, (error, clave) =>
      error ? reject(error) : resolve(clave),
    );
  });
}

/**
 * Hash de contraseñas con scrypt (viene en Node, no necesita compilar nada).
 * Formato guardado: "saltHex:hashHex".
 */
@Injectable()
export class PasswordService {
  async hashear(password: string): Promise<string> {
    const salt = randomBytes(16).toString('hex');
    const hash = await derivar(password, salt);
    return `${salt}${SEPARADOR}${hash.toString('hex')}`;
  }

  /** Comparación en tiempo constante: no filtra información por cuánto tarda. */
  async coincide(password: string, guardado: string): Promise<boolean> {
    const [salt, hashHex] = guardado.split(SEPARADOR);
    if (!salt || !hashHex) return false;

    const esperado = Buffer.from(hashHex, 'hex');
    if (esperado.length !== LARGO_CLAVE) return false;

    const calculado = await derivar(password, salt);
    return timingSafeEqual(esperado, calculado);
  }
}
