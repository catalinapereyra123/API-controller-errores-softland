import type { ReactNode } from 'react'
import {
  AlertTriangleIcon,
  MessageIcon,
  RefreshIcon,
  UserIcon,
} from '../components/icons'
import type { TimelineItem } from '../components/Timeline'
import { colors } from '../styles'
import type {
  HistorialEvento,
  TrazabilidadEvento,
  TrazabilidadTipo,
} from '../types'

// Traduce el tipo de evento (dato del back) a su representación visual.
// El componente Timeline es genérico y no conoce estos tipos de dominio.
const estiloPorTipo: Record<
  TrazabilidadTipo,
  { icon: ReactNode; color: string; background: string }
> = {
  error: {
    icon: <AlertTriangleIcon className="h-4 w-4" />,
    color: colors.label.red.text,
    background: colors.label.red.background,
  },
  asignacion: {
    icon: <UserIcon className="h-4 w-4" />,
    color: colors.label.blue.text,
    background: colors.label.blue.background,
  },
  observacion: {
    icon: <MessageIcon className="h-4 w-4" />,
    color: colors.label.purple.text,
    background: colors.label.purple.background,
  },
  reproceso: {
    icon: <RefreshIcon className="h-4 w-4" />,
    color: colors.label.green.text,
    background: colors.label.green.background,
  },
}

/** Adapta los eventos de trazabilidad al formato genérico de `Timeline`. */
export function trazabilidadToTimelineItems(
  eventos: TrazabilidadEvento[],
): TimelineItem[] {
  return eventos.map((evento) => {
    const estilo = estiloPorTipo[evento.tipo]
    return {
      id: evento.id,
      icon: estilo.icon,
      iconColor: estilo.color,
      iconBackground: estilo.background,
      time: evento.hora,
      title: evento.titulo,
      description: evento.detalle,
    }
  })
}

/** Adapta los eventos del historial (con código de error) a `Timeline`. */
export function historialToTimelineItems(
  eventos: HistorialEvento[],
): TimelineItem[] {
  return eventos.map((evento) => {
    const estilo = estiloPorTipo[evento.tipo]
    return {
      id: evento.id,
      icon: estilo.icon,
      iconColor: estilo.color,
      iconBackground: estilo.background,
      time: evento.hora,
      title: evento.titulo,
      description: `${evento.codigo} · ${evento.empresa} · ${evento.usuario}`,
    }
  })
}
