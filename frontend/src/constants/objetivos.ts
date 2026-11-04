import { colors } from '../styles'
import type {
  EstadoObjetivo,
  ModuloCodigo,
  Objetivo,
  SentidoMeta,
  UnidadObjetivo,
} from '../types'
import { formatMinutes } from '../utils/format'

export const ESTADO_OBJETIVO: Record<
  EstadoObjetivo,
  { label: string; color: string; background: string; barra: string }
> = {
  CUMPLIDO: {
    label: 'Cumplido',
    color: colors.label.green.text,
    background: colors.label.green.background,
    barra: colors.primary.default,
  },
  EN_CAMINO: {
    label: 'En camino',
    color: colors.label.blue.text,
    background: colors.label.blue.background,
    barra: colors.status.info,
  },
  EN_RIESGO: {
    label: 'En riesgo',
    color: colors.label.orange.text,
    background: colors.label.orange.background,
    barra: colors.status.warning,
  },
  SIN_DATOS: {
    label: 'Sin datos',
    color: colors.label.gray.text,
    background: colors.label.gray.background,
    barra: colors.gray.default,
  },
}

export const MODULOS: { value: ModuloCodigo; label: string }[] = [
  { value: 'FACTURACION', label: 'Facturación' },
  { value: 'COMPRAS', label: 'Compras' },
  { value: 'COBRANZAS', label: 'Cobranzas' },
]

export const SENTIDO_LABEL: Record<SentidoMeta, string> = {
  AL_MENOS: 'Al menos',
  A_LO_SUMO: 'A lo sumo',
}

const numero = (valor: number) =>
  valor.toLocaleString('es-AR', { maximumFractionDigits: 1 })

/** "82 %", "3h 30m", "5 errores". */
export function formatValor(
  valor: number | null,
  unidad: UnidadObjetivo,
): string {
  if (valor === null) return '—'
  // Espacio duro: el número y la unidad no se separan al cortar la línea.
  if (unidad === '%') return `${numero(valor)} %`
  if (unidad === 'h') return formatMinutes(valor * 60)
  if (unidad === 'errores')
    return valor === 1 ? '1 error' : `${numero(valor)} errores`
  return numero(valor)
}

/** "al menos 80 %", "a lo sumo 4h". */
export function textoMeta(o: Pick<Objetivo, 'meta' | 'sentido' | 'unidad'>) {
  return `${SENTIDO_LABEL[o.sentido].toLowerCase()} ${formatValor(o.meta, o.unidad)}`
}

/** "Últimos 30 días · Facturación" o "Ahora en la bandeja". */
export function textoAlcance(
  o: Pick<Objetivo, 'periodoDias' | 'alcance' | 'umbralHoras'>,
  alcance: 'periodo' | 'ahora' | 'manual',
): string {
  const base =
    alcance === 'ahora'
      ? 'Ahora en la bandeja'
      : alcance === 'manual'
        ? 'Carga manual'
        : `Últimos ${o.periodoDias} días`
  return [base, o.umbralHoras ? `umbral ${o.umbralHoras} h` : null, o.alcance]
    .filter(Boolean)
    .join(' · ')
}

/**
 * Cambio contra el período anterior, pintado según la meta: en una "a lo
 * sumo" bajar es bueno.
 */
export function tendenciaObjetivo(
  o: Pick<Objetivo, 'valor' | 'anterior' | 'sentido' | 'unidad'>,
): { text: string; mejora: boolean | null } | null {
  if (o.valor === null || o.anterior === null) return null
  const diferencia = Math.round((o.valor - o.anterior) * 10) / 10
  if (diferencia === 0) {
    return { text: 'Igual que el período anterior', mejora: null }
  }
  const sube = diferencia > 0
  const cuanto =
    o.unidad === '%'
      ? `${numero(Math.abs(diferencia))} pts`
      : formatValor(Math.abs(diferencia), o.unidad)
  return {
    text: `${sube ? '+' : '−'}${cuanto} vs. período anterior`,
    mejora: sube === (o.sentido === 'AL_MENOS'),
  }
}
