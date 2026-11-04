import type { EventoMetrica } from '../../generated/prisma/client';
import {
  IndicadorObjetivo,
  OrigenCierre,
  SentidoMeta,
  TipoMetrica,
} from '../../generated/prisma/client';

export type EstadoObjetivo =
  'CUMPLIDO' | 'EN_CAMINO' | 'EN_RIESGO' | 'SIN_DATOS';

/** [desde, hasta) */
export interface Ventana {
  desde: Date;
  hasta: Date;
}

/** Desde las 00:00 de hace `dias - 1` días: igual que la pantalla de Métricas. */
export function inicioVentana(dias: number, ahora = new Date()): Date {
  const desde = new Date(ahora);
  desde.setHours(0, 0, 0, 0);
  desde.setDate(desde.getDate() - (dias - 1));
  return desde;
}

/** La ventana actual y la anterior del mismo largo (para la tendencia). */
export function ventanas(
  dias: number,
  ahora = new Date(),
): { actual: Ventana; anterior: Ventana } {
  const desde = inicioVentana(dias, ahora);
  const desdeAnterior = new Date(desde);
  desdeAnterior.setDate(desdeAnterior.getDate() - dias);
  return {
    actual: { desde, hasta: ahora },
    anterior: { desde: desdeAnterior, hasta: desde },
  };
}

const dentro = (e: EventoMetrica, v: Ventana) =>
  e.createdAt >= v.desde && e.createdAt < v.hasta;

const redondear = (valor: number, decimales = 0) => {
  const factor = 10 ** decimales;
  return Math.round(valor * factor) / factor;
};

const promedio = (valores: number[]) =>
  valores.length ? valores.reduce((a, b) => a + b, 0) / valores.length : null;

/** Minutos del primer evento de cada error (los eventos vienen en orden). */
function primerosMinutos(eventos: EventoMetrica[]): number[] {
  const vistos = new Set<string>();
  const minutos: number[] = [];
  for (const e of eventos) {
    if (vistos.has(e.transaccionId)) continue;
    vistos.add(e.transaccionId);
    if (e.minutosDesdeDeteccion !== null) minutos.push(e.minutosDesdeDeteccion);
  }
  return minutos;
}

/**
 * De los errores que llegaron en la ventana, el % que quedó en S dentro del
 * umbral. Los que todavía no cumplieron el umbral y siguen abiertos no
 * cuentan (no tuvieron su chance); los descartados tampoco.
 */
function resueltosATiempo(
  eventos: EventoMetrica[],
  ventana: Ventana,
  umbralHoras: number,
  ahora: Date,
): number | null {
  const umbralMinutos = umbralHoras * 60;
  const aTiempo = new Set(
    eventos
      .filter(
        (e) =>
          e.tipo === TipoMetrica.RESOLUCION &&
          e.minutosDesdeDeteccion !== null &&
          e.minutosDesdeDeteccion <= umbralMinutos,
      )
      .map((e) => e.transaccionId),
  );
  const descartados = new Set(
    eventos
      .filter((e) => e.tipo === TipoMetrica.DESCARTE)
      .map((e) => e.transaccionId),
  );

  let elegibles = 0;
  let cumplidos = 0;
  for (const llegada of eventos) {
    if (llegada.tipo !== TipoMetrica.LLEGADA || !dentro(llegada, ventana)) {
      continue;
    }
    const id = llegada.transaccionId;
    if (aTiempo.has(id)) {
      elegibles++;
      cumplidos++;
      continue;
    }
    const vencido =
      ahora.getTime() - llegada.createdAt.getTime() >= umbralMinutos * 60000;
    if (vencido && !descartados.has(id)) elegibles++;
  }
  return elegibles ? redondear((cumplidos * 100) / elegibles) : null;
}

/**
 * Valor de un indicador de período. `eventos` tiene que traer todo desde el
 * inicio de la ventana hasta ahora (ya filtrado por módulo / empresa), en
 * orden: "resueltos a tiempo" mira resoluciones posteriores a la ventana.
 * `null` = no hubo casos para medir.
 */
export function valorDePeriodo(
  indicador: IndicadorObjetivo,
  eventos: EventoMetrica[],
  ventana: Ventana,
  opciones: { umbralHoras?: number | null; ahora?: Date } = {},
): number | null {
  const ahora = opciones.ahora ?? new Date();
  const enVentana = eventos.filter((e) => dentro(e, ventana));
  const de = (tipo: TipoMetrica) => enVentana.filter((e) => e.tipo === tipo);

  switch (indicador) {
    case IndicadorObjetivo.RESUELTOS_A_TIEMPO:
      return resueltosATiempo(
        eventos,
        ventana,
        opciones.umbralHoras ?? 48,
        ahora,
      );
    case IndicadorObjetivo.TIEMPO_ASIGNACION: {
      const minutos = promedio(primerosMinutos(de(TipoMetrica.ASIGNACION)));
      return minutos === null ? null : redondear(minutos / 60, 1);
    }
    case IndicadorObjetivo.TIEMPO_RESOLUCION: {
      const minutos = promedio(
        de(TipoMetrica.RESOLUCION).flatMap((e) =>
          e.minutosDesdeDeteccion === null ? [] : [e.minutosDesdeDeteccion],
        ),
      );
      return minutos === null ? null : redondear(minutos / 60, 1);
    }
    case IndicadorObjetivo.EFECTIVIDAD_REPROCESO: {
      const ok = de(TipoMetrica.RESOLUCION).filter(
        (e) => e.origenCierre === OrigenCierre.MANUAL,
      ).length;
      const total = ok + de(TipoMetrica.FALLO_REPROCESO).length;
      return total ? redondear((ok * 100) / total) : null;
    }
    case IndicadorObjetivo.LLEGADAS:
      return de(TipoMetrica.LLEGADA).length;
    case IndicadorObjetivo.RESOLUCIONES:
      return de(TipoMetrica.RESOLUCION).length;
    case IndicadorObjetivo.REAPARICIONES:
      return de(TipoMetrica.REAPARICION).length;
    default:
      // ABIERTOS / SIN_RESPONSABLE / MANUAL no salen de los hitos.
      return null;
  }
}

/**
 * Cuánto del camino a la meta se hizo, 0–100. "A lo sumo": cumplir es estar
 * por debajo; pasarse baja el progreso en proporción (el doble = 50 %).
 */
export function progreso(
  valor: number | null,
  meta: number,
  sentido: SentidoMeta,
): number | null {
  if (valor === null) return null;
  const tope = (p: number) => Math.max(0, Math.min(100, Math.round(p)));
  if (sentido === SentidoMeta.AL_MENOS) {
    return meta <= 0 ? 100 : tope((valor / meta) * 100);
  }
  if (valor <= meta) return 100;
  return tope((meta / valor) * 100);
}

/** Desde el 70 % del camino se considera "en camino". */
export function estadoDe(avance: number | null): EstadoObjetivo {
  if (avance === null) return 'SIN_DATOS';
  if (avance >= 100) return 'CUMPLIDO';
  return avance >= 70 ? 'EN_CAMINO' : 'EN_RIESGO';
}
