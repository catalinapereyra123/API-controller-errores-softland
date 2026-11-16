import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

/** Texto recortado. Los números (NROFOR viene como INT de SQL) pasan a texto. */
const texto = ({ value }: { value: unknown }): string =>
  typeof value === 'string'
    ? value.trim()
    : typeof value === 'number'
      ? String(value)
      : '';

const textoONull = ({ value }: { value: unknown }): string | null => {
  const t = texto({ value });
  return t.length === 0 ? null : t;
};

/**
 * Un comprobante tal cual lo manda el workflow de Studio (una fila de la
 * consulta sobre VTRMVH + GRTXML). Las fechas llegan como texto de SQL
 * ("2026-10-23 11:35:07.000" o ISO) y se parsean en el service.
 *
 * {
 *   "empresa": "FLETCO",
 *   "codfor": "FA0004",
 *   "nrofor": 8133,
 *   "nroCae": null,                       // con valor = ya tiene CAE
 *   "fechaComprobante": "2026-08-21",
 *   "fechaAlta": "2026-10-23T11:35:07",
 *   "usuario": "ADMIN",
 *   "ultimoEnvio": null,                  // GRTXML_FECALT, sólo FCE
 *   "mensajeArca": null,                  // <Err>/<Obs> de ARCA, sólo FCE
 *   "ultimoAutorizadoNro": 8132,
 *   "ultimoAutorizadoFecha": "2026-10-22"
 * }
 */
export class SyncCaeComprobanteDto {
  @Transform(texto)
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  empresa!: string;

  @IsOptional()
  @Transform(textoONull)
  @IsString()
  @MaxLength(200)
  empresaNombre?: string | null;

  @Transform(texto)
  @IsString()
  @MinLength(1)
  @MaxLength(10)
  codfor!: string;

  @Transform(texto)
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  nrofor!: string;

  @IsOptional()
  @Transform(textoONull)
  @IsString()
  @MaxLength(30)
  nroCae?: string | null;

  @IsOptional()
  @Transform(textoONull)
  @IsString()
  fechaComprobante?: string | null;

  @IsOptional()
  @Transform(textoONull)
  @IsString()
  fechaAlta?: string | null;

  @IsOptional()
  @Transform(textoONull)
  @IsString()
  @MaxLength(64)
  usuario?: string | null;

  @IsOptional()
  @Transform(textoONull)
  @IsString()
  ultimoEnvio?: string | null;

  @IsOptional()
  @Transform(textoONull)
  @IsString()
  @MaxLength(2000)
  mensajeArca?: string | null;

  @IsOptional()
  @Transform(textoONull)
  @IsString()
  @MaxLength(20)
  ultimoAutorizadoNro?: string | null;

  @IsOptional()
  @Transform(textoONull)
  @IsString()
  ultimoAutorizadoFecha?: string | null;
}

/**
 * La foto completa: todas las empresas consultadas y sus comprobantes. Una
 * empresa consultada sin comprobantes quiere decir que no le queda ninguno
 * sin CAE.
 */
export class SyncCaeRequestDto {
  @IsArray()
  @IsString({ each: true })
  empresasConsultadas!: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyncCaeComprobanteDto)
  comprobantes!: SyncCaeComprobanteDto[];

  /** true si no es la foto completa (Studio manda de a un comprobante). */
  parcial!: boolean;
}

/**
 * Lo que devuelve SyncCaePipe. Es un alias y no la clase a propósito: con la
 * clase como tipo del parámetro, el ValidationPipe global validaría el body
 * crudo antes que el pipe y rechazaría un comprobante suelto.
 */
export type SyncCaeSolicitud = Pick<
  SyncCaeRequestDto,
  'empresasConsultadas' | 'comprobantes' | 'parcial'
>;

export interface SyncCaeResultadoDto {
  recibidos: number;
  creados: number;
  actualizados: number;
  /** Llegaron con CAE y estaban abiertos: se cerraron. */
  cerrados: number;
  /** Llegaron con CAE y no estaban en IRIS: no hay nada que seguir. */
  ignorados: number;
  /** Abiertos que no vinieron en una foto completa (sólo si no es parcial). */
  yaNoFiguran: number;
  procesadoEn: string;
}
