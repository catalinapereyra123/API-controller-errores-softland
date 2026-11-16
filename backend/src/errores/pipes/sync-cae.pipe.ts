import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
  ValidationPipe,
} from '@nestjs/common';
import { parsearJsonTolerante } from '../../common/json-tolerante';
import { SyncCaeRequestDto } from '../dto/sync-cae.dto';

/** Nombre de cada campo en minúsculas → nombre del DTO. */
const CAMPOS = [
  'empresa',
  'empresaNombre',
  'codfor',
  'nrofor',
  'nroCae',
  'fechaComprobante',
  'fechaAlta',
  'usuario',
  'ultimoEnvio',
  'mensajeArca',
  'ultimoAutorizadoNro',
  'ultimoAutorizadoFecha',
];
const POR_MINUSCULA = new Map(CAMPOS.map((c) => [c.toLowerCase(), c]));

/**
 * Normaliza el body de POST /errores/sync-cae y lo valida. Acepta:
 *
 * - `{ empresasConsultadas, comprobantes }`: la foto completa.
 * - un array de comprobantes, o un comprobante solo: parcial (Studio suele
 *   mandar una llamada por fila). Ahí no se marca nada como "ya no figura".
 *
 * Los nombres de campo no distinguen mayúsculas (`NroFor`, `NROFOR` y
 * `nrofor` son lo mismo), así sirve el alias que tenga la consulta.
 *
 * El JSON también puede llegar como texto (la consulta de Studio lo arma con
 * FOR JSON en una sola celda): solo, o dentro de un objeto de un solo campo
 * (`{ "body": "{...}" }`).
 */
@Injectable()
export class SyncCaePipe implements PipeTransform {
  private readonly validator = new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: false,
  });

  async transform(
    crudo: unknown,
    metadata: ArgumentMetadata,
  ): Promise<SyncCaeRequestDto> {
    const value = this.desenvolver(crudo);
    const completo =
      this.esObjeto(value) && Array.isArray(value.comprobantes) ? value : null;
    const filas: unknown[] = completo
      ? (completo.comprobantes as unknown[])
      : Array.isArray(value)
        ? value
        : [value];

    const payload = {
      empresasConsultadas:
        completo && Array.isArray(completo.empresasConsultadas)
          ? completo.empresasConsultadas
          : [],
      comprobantes: filas.map((fila) => this.normalizarFila(fila)),
      parcial: !completo,
    };

    const validado: unknown = await this.validator.transform(payload, {
      ...metadata,
      metatype: SyncCaeRequestDto,
    });
    return { ...(validado as SyncCaeRequestDto), parcial: payload.parcial };
  }

  /** Si el JSON vino como texto (solo o en un objeto de un campo), lo parsea. */
  private desenvolver(value: unknown): unknown {
    const valores = this.esObjeto(value) ? Object.values(value) : [];
    const texto =
      typeof value === 'string'
        ? value
        : valores.length === 1 && typeof valores[0] === 'string'
          ? valores[0]
          : null;
    if (texto === null || !/^\s*[[{]/.test(texto)) return value;
    try {
      return parsearJsonTolerante(texto).valor;
    } catch {
      throw new BadRequestException(
        'El body trae un texto que no es un JSON válido.',
      );
    }
  }

  private normalizarFila(fila: unknown): unknown {
    if (!this.esObjeto(fila)) return fila;
    const normalizada: Record<string, unknown> = {};
    for (const [clave, valor] of Object.entries(fila)) {
      const campo = POR_MINUSCULA.get(clave.toLowerCase());
      if (campo) normalizada[campo] = valor;
    }
    return normalizada;
  }

  private esObjeto(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }
}
