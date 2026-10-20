import { Logger } from '@nestjs/common';
import express, { type RequestHandler } from 'express';

const logger = new Logger('JsonTolerante');

/** Mismo límite que el parser JSON que Nest registra por defecto. */
const LIMITE_BODY = '100kb';

const ESCAPE_DE_CONTROL: Record<string, string> = {
  '\n': '\\n',
  '\r': '\\r',
  '\t': '\\t',
  '\b': '\\b',
  '\f': '\\f',
};

/**
 * Repara el JSON que arma iFlow pegando texto de Softland sin escaparlo.
 * Los mensajes traen rutas de Windows (`c:\padron\2026-10-20_..._Err.txt`):
 * esa barra sola no es un escape válido y el JSON no parsea.
 *
 * Sólo toca lo que está DENTRO de los strings:
 *  - cada `\` pasa a `\\` (una barra literal), salvo `\"`, que se deja como
 *    comilla escapada. Si el JSON llegó roto es porque el que lo armó no
 *    escapó nada, así que las barras son literales: `c:\temp` sigue siendo
 *    `c:\temp` y no un tab.
 *  - los saltos de línea y otros caracteres de control sueltos se escapan.
 *
 * Se usa sólo cuando el `JSON.parse` normal falla: un JSON válido no pasa
 * por acá.
 */
export function repararJson(texto: string): string {
  let salida = '';
  let enString = false;

  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];

    if (!enString) {
      if (c === '"') enString = true;
      salida += c;
      continue;
    }

    if (c === '"') {
      enString = false;
      salida += c;
    } else if (c === '\\') {
      if (texto[i + 1] === '"') {
        salida += '\\"';
        i++;
      } else {
        salida += '\\\\';
      }
    } else if (c < ' ') {
      salida +=
        ESCAPE_DE_CONTROL[c] ??
        `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`;
    } else {
      salida += c;
    }
  }

  return salida;
}

/** `JSON.parse` que, si falla, prueba de nuevo con el texto reparado. */
export function parsearJsonTolerante(texto: string): {
  valor: unknown;
  reparado: boolean;
} {
  try {
    return { valor: JSON.parse(texto), reparado: false };
  } catch (error) {
    try {
      return { valor: JSON.parse(repararJson(texto)), reparado: true };
    } catch {
      // Roto por otra cosa: se informa el error del texto original.
      throw error;
    }
  }
}

/**
 * Reemplaza al parser JSON por defecto de Nest (que rechaza con 400 los
 * mensajes de Softland con rutas de Windows). Lee el body como texto y lo
 * parsea con `parsearJsonTolerante`.
 */
export function jsonTolerante(): RequestHandler[] {
  const leerComoTexto = express.text({
    type: 'application/json',
    limit: LIMITE_BODY,
  });

  const parsear: RequestHandler = (req, res, next) => {
    if (typeof req.body !== 'string') return next();

    if (req.body.trim() === '') {
      req.body = {};
      return next();
    }

    try {
      const { valor, reparado } = parsearJsonTolerante(req.body);
      if (reparado) {
        logger.warn(
          `${req.method} ${req.originalUrl}: llegó JSON con barras o saltos sin escapar; se reparó.`,
        );
      }
      req.body = valor;
      next();
    } catch (error) {
      // Mismo formato que los errores de Nest.
      res.status(400).json({
        message: (error as Error).message,
        error: 'Bad Request',
        statusCode: 400,
      });
    }
  };

  return [leerComoTexto, parsear];
}
