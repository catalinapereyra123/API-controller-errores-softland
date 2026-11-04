import {
  IndicadorObjetivo,
  SentidoMeta,
  TipoObjetivo,
} from '../../generated/prisma/client';
import type { CrearObjetivoDto } from './dto/objetivos.dto';

/**
 * Qué mide cada indicador. `periodo` = cuenta los hitos de la ventana;
 * `ahora` = foto de la bandeja (no tiene período ni tendencia);
 * `manual` = el valor lo carga alguien.
 */
export interface IndicadorInfo {
  id: IndicadorObjetivo;
  nombre: string;
  descripcion: string;
  /** `valor`: número libre (las de carga manual). */
  unidad: '%' | 'h' | 'errores' | 'valor';
  /** Sentido sugerido al crear: lo que normalmente es "mejor". */
  sentido: SentidoMeta;
  alcance: 'periodo' | 'ahora' | 'manual';
  /** Se puede acotar a un módulo o a una empresa. */
  filtrable: boolean;
  usaUmbral: boolean;
}

export const UMBRAL_HORAS_DEFAULT = 48;

export const CATALOGO: IndicadorInfo[] = [
  {
    id: IndicadorObjetivo.RESUELTOS_A_TIEMPO,
    nombre: 'Resueltos a tiempo',
    descripcion:
      'De los errores que llegaron en el período, cuántos quedaron en S dentro del umbral. Los que todavía están dentro del umbral no cuentan.',
    unidad: '%',
    sentido: SentidoMeta.AL_MENOS,
    alcance: 'periodo',
    filtrable: true,
    usaUmbral: true,
  },
  {
    id: IndicadorObjetivo.TIEMPO_ASIGNACION,
    nombre: 'Tiempo hasta asignar',
    descripcion:
      'Promedio desde que se detecta un error hasta que alguien lo toma (sólo la primera asignación).',
    unidad: 'h',
    sentido: SentidoMeta.A_LO_SUMO,
    alcance: 'periodo',
    filtrable: true,
    usaUmbral: false,
  },
  {
    id: IndicadorObjetivo.TIEMPO_RESOLUCION,
    nombre: 'Tiempo hasta resolver',
    descripcion:
      'Promedio desde que se detecta un error hasta que queda en S, por reproceso o por verificación.',
    unidad: 'h',
    sentido: SentidoMeta.A_LO_SUMO,
    alcance: 'periodo',
    filtrable: true,
    usaUmbral: false,
  },
  {
    id: IndicadorObjetivo.EFECTIVIDAD_REPROCESO,
    nombre: 'Efectividad de reprocesos',
    descripcion:
      'De los reprocesos que ya tienen resultado, cuántos quedaron en S.',
    unidad: '%',
    sentido: SentidoMeta.AL_MENOS,
    alcance: 'periodo',
    filtrable: true,
    usaUmbral: false,
  },
  {
    id: IndicadorObjetivo.SIN_RESPONSABLE,
    nombre: 'Errores sin responsable',
    descripcion:
      'Errores abiertos que nadie tomó todavía. Es una foto de la bandeja ahora.',
    unidad: 'errores',
    sentido: SentidoMeta.A_LO_SUMO,
    alcance: 'ahora',
    filtrable: true,
    usaUmbral: false,
  },
  {
    id: IndicadorObjetivo.ABIERTOS,
    nombre: 'Errores abiertos',
    descripcion:
      'Todo lo que sigue abierto en la bandeja ahora (sin contar los X).',
    unidad: 'errores',
    sentido: SentidoMeta.A_LO_SUMO,
    alcance: 'ahora',
    filtrable: true,
    usaUmbral: false,
  },
  {
    id: IndicadorObjetivo.LLEGADAS,
    nombre: 'Errores que llegaron',
    descripcion: 'Errores nuevos que trajo el sync en el período.',
    unidad: 'errores',
    sentido: SentidoMeta.A_LO_SUMO,
    alcance: 'periodo',
    filtrable: true,
    usaUmbral: false,
  },
  {
    id: IndicadorObjetivo.RESOLUCIONES,
    nombre: 'Errores resueltos',
    descripcion: 'Errores que quedaron en S en el período.',
    unidad: 'errores',
    sentido: SentidoMeta.AL_MENOS,
    alcance: 'periodo',
    filtrable: true,
    usaUmbral: false,
  },
  {
    id: IndicadorObjetivo.REAPARICIONES,
    nombre: 'Reapariciones',
    descripcion:
      'Errores que estaban resueltos y volvieron a fallar en el período.',
    unidad: 'errores',
    sentido: SentidoMeta.A_LO_SUMO,
    alcance: 'periodo',
    filtrable: true,
    usaUmbral: false,
  },
  {
    id: IndicadorObjetivo.MANUAL,
    nombre: 'Carga manual',
    descripcion:
      'Para algo que la app no mide (p. ej. una encuesta): el valor se actualiza a mano.',
    unidad: 'valor',
    sentido: SentidoMeta.AL_MENOS,
    alcance: 'manual',
    filtrable: false,
    usaUmbral: false,
  },
];

export const INFO_INDICADOR = new Map(CATALOGO.map((i) => [i.id, i]));

/**
 * Lo que se carga con "Usar la propuesta": una NSM que resume el valor que da
 * el equipo (que Softland quede sin errores rápido) y los KR que la empujan.
 * El último arranca pausado para que se vea cómo se activa.
 */
export const PROPUESTA: {
  nsm: CrearObjetivoDto;
  krs: CrearObjetivoDto[];
} = {
  nsm: {
    tipo: TipoObjetivo.NSM,
    nombre: 'Errores resueltos en 48 h',
    descripcion:
      'Si los errores de integración se resuelven rápido, la facturación, las compras y las cobranzas de cada empresa no se frenan.',
    indicador: IndicadorObjetivo.RESUELTOS_A_TIEMPO,
    meta: 80,
    sentido: SentidoMeta.AL_MENOS,
    periodoDias: 30,
    umbralHoras: UMBRAL_HORAS_DEFAULT,
  },
  krs: [
    {
      tipo: TipoObjetivo.KR,
      nombre: 'Asignar en menos de 4 h',
      descripcion: 'Que nadie espere: cuanto antes se toma, antes se corrige.',
      indicador: IndicadorObjetivo.TIEMPO_ASIGNACION,
      meta: 4,
      sentido: SentidoMeta.A_LO_SUMO,
      periodoDias: 30,
    },
    {
      tipo: TipoObjetivo.KR,
      nombre: 'Reprocesos que salen bien',
      descripcion: 'Corregir bien la primera vez evita idas y vueltas.',
      indicador: IndicadorObjetivo.EFECTIVIDAD_REPROCESO,
      meta: 90,
      sentido: SentidoMeta.AL_MENOS,
      periodoDias: 30,
    },
    {
      tipo: TipoObjetivo.KR,
      nombre: 'Bandeja sin huérfanos',
      descripcion: 'Errores abiertos sin responsable en este momento.',
      indicador: IndicadorObjetivo.SIN_RESPONSABLE,
      meta: 5,
      sentido: SentidoMeta.A_LO_SUMO,
    },
    {
      tipo: TipoObjetivo.KR,
      nombre: 'Que no vuelvan',
      descripcion: 'Resueltos que vuelven a fallar: señal de que se emparchó.',
      indicador: IndicadorObjetivo.REAPARICIONES,
      meta: 3,
      sentido: SentidoMeta.A_LO_SUMO,
      periodoDias: 30,
    },
    {
      tipo: TipoObjetivo.KR,
      nombre: 'Resolver en menos de 24 h',
      indicador: IndicadorObjetivo.TIEMPO_RESOLUCION,
      meta: 24,
      sentido: SentidoMeta.A_LO_SUMO,
      periodoDias: 30,
      activo: false,
    },
  ],
};
