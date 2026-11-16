import { BadRequestException } from '@nestjs/common';
import type {
  Empresa,
  EventoTrazabilidad,
  Observacion,
  TransaccionError,
  Usuario,
} from '../../generated/prisma/client';
import {
  ClaseCae,
  ClaseMetrica,
  EstadoApp,
  Modulo,
  OrigenCierre,
  TipoTransaccion,
} from '../../generated/prisma/client';
import type { ErrorCierreDto } from './dto/historial.dto';

/** Etiqueta legible por módulo (la que muestra el front). */
export const MODULO_LABEL: Record<Modulo, string> = {
  FACTURACION: 'Facturación',
  COMPRAS: 'Compras',
  COBRANZAS: 'Cobranzas',
};

/** Etiqueta legible por estado de gestión. */
export const ESTADO_LABEL: Record<EstadoApp, string> = {
  ERROR: 'Error',
  ASIGNADO: 'Asignado',
  EN_PROGRESO: 'En progreso',
  REPROCESANDO: 'Reprocesando',
  REQUIERE_CORRECCION: 'Requiere corrección',
  RESUELTO: 'Resuelto',
  DESCARTADO: 'Descartado',
};

/** Un error se considera "abierto" mientras no esté RESUELTO ni DESCARTADO. */
export const ESTADOS_ABIERTOS: EstadoApp[] = [
  EstadoApp.ERROR,
  EstadoApp.ASIGNADO,
  EstadoApp.EN_PROGRESO,
  EstadoApp.REPROCESANDO,
  EstadoApp.REQUIERE_CORRECCION,
];

/**
 * Estados que verifica el flujo 5 contra Softland: los abiertos MENOS
 * REPROCESANDO. Un reproceso en curso lo resuelve el flujo 2/4 (que sabe que
 * el status 'N' es transitorio); si los dos tocaran el mismo registro se
 * pisarían. Esto reemplaza al `en_reproceso` booleano de la especificación:
 * el estado ya lo dice, y duplicarlo sería una segunda fuente de verdad.
 */
export const ESTADOS_VERIFICABLES: EstadoApp[] = ESTADOS_ABIERTOS.filter(
  (e) => e !== EstadoApp.REPROCESANDO,
);

/**
 * Estados que se pueden setear a mano desde la app (PATCH /errores/:id/estado).
 * REPROCESANDO / REQUIERE_CORRECCION / RESUELTO los controla SOLO el flujo de
 * reproceso: RESUELTO tiene que venir de Softland (statusSoftland = S).
 * DESCARTADO es para lo que no interesa (p. ej. restos de pruebas): sale de la
 * bandeja, el sync no lo reabre y no se puede mandar a reprocesar.
 */
export const ESTADOS_MANUALES: EstadoApp[] = [
  EstadoApp.ERROR,
  EstadoApp.ASIGNADO,
  EstadoApp.EN_PROGRESO,
  EstadoApp.DESCARTADO,
];

/** Tipo de evento de trazabilidad según el estado (define el ícono en el front). */
export function tipoEventoPorEstado(estado: EstadoApp): string {
  if (estado === EstadoApp.ASIGNADO || estado === EstadoApp.EN_PROGRESO) {
    return 'asignacion';
  }
  if (estado === EstadoApp.REPROCESANDO || estado === EstadoApp.RESUELTO) {
    return 'reproceso';
  }
  if (estado === EstadoApp.DESCARTADO) return 'descarte';
  return 'error';
}

/**
 * Status de Softland que llegan a la app pero no son errores a resolver:
 * X (excluida del proceso) y D (diferencia: se mira, no se reprocesa). No
 * suman en los contadores ni en los prioritarios; se informan aparte.
 */
export const STATUS_FUERA_DE_CONTADORES = ['X', 'D'];

/** Clase del hito según el status de Softland en ese momento. */
export function claseMetrica(status: string): ClaseMetrica {
  if (status === 'D') return ClaseMetrica.DIFERENCIA;
  if (status === 'X') return ClaseMetrica.EXCLUIDA;
  return ClaseMetrica.ERROR;
}

/** Status de Softland que significan "sigue fallando". */
export function statusEsError(status: string): boolean {
  return ['E', 'D', 'B', 'X'].includes(status);
}

/**
 * Normaliza el texto de módulo de Softland ("1. Facturacion", "3. Compras",
 * "2. Cobranzas / Recibos", ...) al enum interno.
 * Lanza 400 si no se puede reconocer, así el llamador reporta el registro
 * en vez de archivarlo mal.
 */
export function parseModulo(raw: string): Modulo {
  const texto = raw.trim().toLowerCase();
  const numero = texto.match(/^(\d+)/)?.[1];

  if (numero === '1') return Modulo.FACTURACION;
  if (numero === '2') return Modulo.COBRANZAS;
  if (numero === '3') return Modulo.COMPRAS;

  if (texto.includes('factur')) return Modulo.FACTURACION;
  if (texto.includes('compr')) return Modulo.COMPRAS;
  if (texto.includes('cobr') || texto.includes('recib')) {
    return Modulo.COBRANZAS;
  }

  throw new BadRequestException(`Módulo no reconocido: "${raw}"`);
}

/** Extrae la ruta del archivo de log de un mensaje de Softland, si existe. */
export function extractArchivoLog(
  mensaje: string | null | undefined,
): string | null {
  if (!mensaje) return null;
  const match = mensaje.match(/verificar el archivo\s+(.+?\.txt)/i);
  return match ? match[1].trim() : null;
}

type TransaccionConRelaciones = TransaccionError & {
  empresa?: Empresa | null;
  responsable?: Usuario | null;
  observaciones?: Observacion[];
  eventos?: EventoTrazabilidad[];
};

/**
 * Forma "plana" que consume la bandeja del front (tipo `ErrorTransaccion`).
 * Mantener alineado con frontend/src/types/index.ts (el front necesita sumar
 * los estados REPROCESANDO y REQUIERE_CORRECCION a `ErrorEstado`).
 */
export function toErrorTransaccion(t: TransaccionConRelaciones) {
  return {
    id: t.id,
    codigo: t.identi,
    estado: t.estadoApp,
    empresaId: t.empresaCodigo,
    empresaNombre: t.empresa?.nombre ?? t.empresaCodigo,
    modulo: MODULO_LABEL[t.modulo],
    descripcion: descripcionDe(t),
    responsableId: t.responsableId,
    abiertoDesde: t.fechaDeteccion.toISOString(),
    intentos: t.intentos,
    // Campos extra (el front los ignora si no los usa):
    moduloCodigo: t.modulo,
    statusSoftland: t.statusSoftland,
    cuenta: t.cuenta,
    fechaMovimiento: t.fechaMovimiento ? t.fechaMovimiento.toISOString() : null,
    archivoLog: t.archivoLog,
    corregidoPorId: t.corregidoPorId,
    corregidoPor: t.corregidoPorNombre,
    fechaCorreccion: t.fechaCorreccion ? t.fechaCorreccion.toISOString() : null,
    fechaResolucion: t.fechaResolucion ? t.fechaResolucion.toISOString() : null,
    ultimaDeteccion: t.ultimaDeteccion.toISOString(),
    presenteEnUltimaSync: t.presenteEnUltimaSync,
    origenCierre: t.origenCierre,
    cerradoAutomaticamente:
      t.origenCierre === OrigenCierre.VERIFICACION_AUTOMATICA,
    ultimaVerificacion: t.ultimaVerificacionAt
      ? t.ultimaVerificacionAt.toISOString()
      : null,
    tipo: t.tipo,
    sinCae: t.tipo === TipoTransaccion.SIN_CAE ? datosSinCae(t) : null,
  };
}

export type ErrorTransaccionDto = ReturnType<typeof toErrorTransaccion>;

/** GET /sin-cae: la lista y los indicadores de arriba (sólo abiertos). */
export interface SinCaeListaDto {
  items: ErrorTransaccionDto[];
  indicadores: {
    total: number;
    trabanPv: number;
    masDe2Dias: number;
    sinAsignar: number;
  };
}

// ---------------------------------------------------------------------------
//  Sin CAE
// ---------------------------------------------------------------------------

/**
 * Clase de un comprobante según su CODFOR. La letra del comprobante va
 * después de FCE/NCE/NDE (FCEA16, NCEE19) o en la segunda posición (FA0011,
 * FE0019, FAC009). La E es exportación.
 */
export function claseCae(codfor: string): ClaseCae {
  const fce = /^(FCE|NCE|NDE)([A-Z])/.exec(codfor.toUpperCase());
  if (fce) return fce[2] === 'E' ? ClaseCae.EXPORTACION : ClaseCae.FCE;
  return codfor.toUpperCase().charAt(1) === 'E'
    ? ClaseCae.EXPORTACION
    : ClaseCae.LOCAL;
}

/** El identi de un sin CAE es "CODFOR NROFOR". */
export function identiSinCae(codfor: string, nrofor: string): string {
  return `${codfor.trim()} ${nrofor.trim()}`;
}

function separarIdenti(identi: string): { codfor: string; nrofor: string } {
  const espacio = identi.lastIndexOf(' ');
  return espacio < 0
    ? { codfor: identi, nrofor: '' }
    : { codfor: identi.slice(0, espacio), nrofor: identi.slice(espacio + 1) };
}

export type DiagnosticoSinCae =
  | 'TRABA_PV'
  | 'FECHA_ANTERIOR'
  | 'RECHAZO_ARCA'
  | 'NO_ENVIADO'
  | 'SIN_DATOS_ENVIO'
  | 'YA_NO_FIGURA';

export const DIAGNOSTICO_LABEL: Record<DiagnosticoSinCae, string> = {
  TRABA_PV: 'Traba el punto de venta',
  FECHA_ANTERIOR: 'Fecha anterior al último autorizado',
  RECHAZO_ARCA: 'ARCA lo rechazó',
  NO_ENVIADO: 'No se envió a ARCA',
  SIN_DATOS_ENVIO: 'Sin datos del envío',
  YA_NO_FIGURA: 'Ya no figura en Softland',
};

const soloDia = (fecha: Date) =>
  Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), fecha.getUTCDate());

/**
 * Lo que IRIS sabe de por qué un comprobante no tiene CAE, comparándolo con
 * el último autorizado de su CODFOR. Puede haber más de uno.
 */
export function diagnosticosSinCae(t: TransaccionError): DiagnosticoSinCae[] {
  const { nrofor } = separarIdenti(t.identi);
  const diagnosticos: DiagnosticoSinCae[] = [];
  const ultimo = Number(t.ultimoAutorizadoNro);
  if (t.ultimoAutorizadoNro && Number(nrofor) === ultimo + 1) {
    diagnosticos.push('TRABA_PV');
  }
  if (
    t.fechaMovimiento &&
    t.ultimoAutorizadoFecha &&
    soloDia(t.fechaMovimiento) < soloDia(t.ultimoAutorizadoFecha)
  ) {
    diagnosticos.push('FECHA_ANTERIOR');
  }
  if (t.claseCae === ClaseCae.FCE) {
    if (t.errorMensaje) diagnosticos.push('RECHAZO_ARCA');
    else if (!t.ultimoEnvioArca) diagnosticos.push('NO_ENVIADO');
  } else {
    diagnosticos.push('SIN_DATOS_ENVIO');
  }
  if (!t.presenteEnUltimaSync && !t.nroCae) diagnosticos.push('YA_NO_FIGURA');
  return diagnosticos;
}

/** Días desde el alta en Softland (o la detección) hasta hoy o el cierre. */
function diasSinCae(t: TransaccionError, hoy = new Date()): number {
  const desde = t.fechaAltaSoftland ?? t.fechaDeteccion;
  const hasta = t.fechaResolucion ?? hoy;
  return Math.max(
    0,
    Math.floor((hasta.getTime() - desde.getTime()) / (24 * 60 * 60 * 1000)),
  );
}

function datosSinCae(t: TransaccionError) {
  const { codfor, nrofor } = separarIdenti(t.identi);
  const diagnosticos = diagnosticosSinCae(t);
  return {
    codfor,
    nrofor,
    clase: t.claseCae,
    nroCae: t.nroCae,
    fechaAlta: t.fechaAltaSoftland ? t.fechaAltaSoftland.toISOString() : null,
    usuarioAlta: t.usuarioAltaSoftland,
    ultimoEnvioArca: t.ultimoEnvioArca ? t.ultimoEnvioArca.toISOString() : null,
    mensajeArca: t.errorMensaje,
    ultimoAutorizadoNro: t.ultimoAutorizadoNro,
    ultimoAutorizadoFecha: t.ultimoAutorizadoFecha
      ? t.ultimoAutorizadoFecha.toISOString()
      : null,
    diasSinCae: diasSinCae(t),
    diagnosticos,
    trabaPv: diagnosticos.includes('TRABA_PV'),
  };
}

/**
 * Error del Historial / Mi espacio: `resuelto` si quedó en S desde `desde`;
 * si no, `corregido` (se mandó a reprocesar en el período y sigue esperando
 * o volvió con error).
 */
export function toErrorCierre(
  t: TransaccionConRelaciones,
  desde: Date,
): ErrorCierreDto {
  const resuelto =
    t.estadoApp === EstadoApp.RESUELTO &&
    t.fechaResolucion !== null &&
    t.fechaResolucion >= desde;
  const fecha =
    (resuelto ? t.fechaResolucion : t.fechaCorreccion) ?? t.updatedAt;
  const automatico =
    resuelto && t.origenCierre === OrigenCierre.VERIFICACION_AUTOMATICA;

  return {
    ...toErrorTransaccion(t),
    tipoCierre: resuelto ? 'resuelto' : 'corregido',
    fechaCierre: fecha.toISOString(),
    cerradoPor: automatico ? null : t.corregidoPorNombre,
    minutosResolucion:
      t.estadoApp === EstadoApp.RESUELTO && t.fechaResolucion
        ? Math.round(
            (t.fechaResolucion.getTime() - t.fechaDeteccion.getTime()) / 60000,
          )
        : null,
  };
}

/** Promedio redondeado; 0 si no hay valores (así lo muestra el dashboard). */
export function promedio(valores: number[]): number {
  return valores.length
    ? Math.round(valores.reduce((acc, v) => acc + v, 0) / valores.length)
    : 0;
}

function descripcionDe(t: TransaccionError): string {
  if (t.errorMensaje) return t.errorMensaje;
  if (t.tipo === TipoTransaccion.SIN_CAE) {
    const [principal] = diagnosticosSinCae(t);
    return principal ? DIAGNOSTICO_LABEL[principal] : 'Sin CAE';
  }
  if (t.statusSoftland === 'X') return 'Transacción excluida del proceso.';
  if (t.statusSoftland === 'D')
    return 'Diferencia o inconsistencia en la transacción.';
  return '—';
}

// ---------------------------------------------------------------------------
//  Fechas del historial (agrupación por día)
// ---------------------------------------------------------------------------

const DIAS_SEMANA = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
];

const dosDigitos = (n: number) => String(n).padStart(2, '0');

/** yyyy-mm-dd en hora local: sirve de clave/ID del grupo. */
export function claveDia(fecha: Date): string {
  return `${fecha.getFullYear()}-${dosDigitos(fecha.getMonth() + 1)}-${dosDigitos(fecha.getDate())}`;
}

/** dd/mm/yyyy */
export function formatoFecha(fecha: Date): string {
  return `${dosDigitos(fecha.getDate())}/${dosDigitos(fecha.getMonth() + 1)}/${fecha.getFullYear()}`;
}

/**
 * "Hoy", "Ayer", el día de la semana si fue en los últimos 7 días, o la fecha
 * (dd/mm/yyyy) si es más vieja: con períodos de 30/90 días el nombre del día
 * se repetiría.
 */
export function etiquetaDia(fecha: Date, hoy: Date = new Date()): string {
  const clave = claveDia(fecha);
  if (clave === claveDia(hoy)) return 'Hoy';

  const ayer = new Date(hoy);
  ayer.setDate(ayer.getDate() - 1);
  if (clave === claveDia(ayer)) return 'Ayer';

  const haceUnaSemana = new Date(hoy);
  haceUnaSemana.setHours(0, 0, 0, 0);
  haceUnaSemana.setDate(haceUnaSemana.getDate() - 6);
  if (fecha >= haceUnaSemana) return DIAS_SEMANA[fecha.getDay()];

  return formatoFecha(fecha);
}

/** Clave del punto del gráfico: el día, o el día y la hora. */
function claveSerie(fecha: Date, porHora: boolean): string {
  const dia = claveDia(fecha);
  return porHora ? `${dia}T${dosDigitos(fecha.getHours())}` : dia;
}

/**
 * Puntos del gráfico desde `desde` hasta `hoy`: uno por día, o uno por hora
 * si el período es sólo hoy (con un único punto no hay línea). Los días sin
 * movimiento quedan en 0 para que el gráfico no los saltee.
 */
export function armarSerie<K extends string>(
  desde: Date,
  fechas: Record<K, Date[]>,
  hoy: Date = new Date(),
): ({ id: string; etiqueta: string } & Record<K, number>)[] {
  type Punto = { id: string; etiqueta: string } & Record<K, number>;
  const campos = Object.keys(fechas) as K[];
  const porHora = claveDia(desde) === claveDia(hoy);
  const puntos = new Map<string, Punto>();

  for (const cursor = new Date(desde); cursor <= hoy;) {
    const id = claveSerie(cursor, porHora);
    puntos.set(id, {
      id,
      etiqueta: porHora
        ? `${cursor.getHours()} h`
        : `${dosDigitos(cursor.getDate())}/${dosDigitos(cursor.getMonth() + 1)}`,
      ...Object.fromEntries(campos.map((campo) => [campo, 0])),
    } as Punto);
    if (porHora) cursor.setHours(cursor.getHours() + 1);
    else cursor.setDate(cursor.getDate() + 1);
  }

  for (const campo of campos) {
    for (const fecha of fechas[campo]) {
      const punto = puntos.get(claveSerie(fecha, porHora));
      if (punto) (punto as Record<K, number>)[campo]++;
    }
  }

  return [...puntos.values()];
}
