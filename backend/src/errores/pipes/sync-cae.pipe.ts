import {
  ArgumentMetadata,
  Injectable,
  PipeTransform,
  ValidationPipe,
} from '@nestjs/common';
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
 */
@Injectable()
export class SyncCaePipe implements PipeTransform {
  private readonly validator = new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: false,
  });

  async transform(
    value: unknown,
    metadata: ArgumentMetadata,
  ): Promise<SyncCaeRequestDto> {
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
