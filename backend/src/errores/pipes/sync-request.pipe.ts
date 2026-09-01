import {
  ArgumentMetadata,
  Injectable,
  PipeTransform,
  ValidationPipe,
} from '@nestjs/common';
import { SyncRequestDto } from '../dto/sync-request.dto';

/**
 * Normaliza el payload de sincronización y valida su contenido.
 *
 * Se conserva el array histórico por compatibilidad. El objeto es el formato
 * recomendado porque puede declarar empresas que devolvieron cero errores.
 */
@Injectable()
export class SyncRequestPipe implements PipeTransform {
  private readonly validator = new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: false,
  });

  async transform(
    value: unknown,
    metadata: ArgumentMetadata,
  ): Promise<SyncRequestDto> {
    const payload = Array.isArray(value)
      ? {
          errores: value,
          empresasConsultadas: this.empresasDe(value),
        }
      : value;
    const normalized = this.normalizarPayload(payload);

    const validated: unknown = await this.validator.transform(normalized, {
      ...metadata,
      metatype: SyncRequestDto,
    });

    return validated as SyncRequestDto;
  }

  private normalizarPayload(payload: unknown): unknown {
    if (!this.esRegistro(payload)) return payload;

    const errores = payload.errores;
    if (!Array.isArray(errores)) return payload;

    return {
      ...payload,
      errores: errores.map((registro) => this.normalizarRegistro(registro)),
    };
  }

  private normalizarRegistro(registro: unknown): unknown {
    if (!this.esRegistro(registro)) return registro;

    return {
      ...registro,
      statusSoftland: registro.statusSoftland ?? registro.status,
      fecha: registro.fecha ?? registro.fechaMovimiento,
    };
  }

  private empresasDe(registros: unknown[]): string[] {
    const codigos = registros.flatMap((registro) => {
      if (!this.esRegistro(registro)) return [];
      const empresa = registro.empresa;
      return typeof empresa === 'string' && empresa.trim()
        ? [empresa.trim()]
        : [];
    });

    return [...new Set(codigos)];
  }

  private esRegistro(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }
}
