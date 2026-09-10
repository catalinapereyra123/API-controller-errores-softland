import type { ReactNode } from 'react'
import { colors, fontWeight, radius, textStyles } from '../styles'
import type { ErrorDetalle } from '../types'
import { formatDetectedAt, formatElapsedSince } from '../utils/format'
import Card from './Card'
import { AlertTriangleIcon, BanIcon, ClockIcon } from './icons'

interface AvisoProps {
  tono: { text: string; background: string }
  icon: ReactNode
  titulo: string
  /** Dato corto a la derecha, p. ej. cuánto hace que espera. */
  extra?: string
  children: ReactNode
}

function Aviso({ tono, icon, titulo, extra, children }: AvisoProps) {
  return (
    <Card
      backgroundColor={tono.background}
      shadow={false}
      radiusSize="lg"
      padding="md"
    >
      <div className="flex items-start gap-sm">
        <span
          style={{
            color: tono.text,
            backgroundColor: colors.background.surface,
          }}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
        >
          {icon}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-xxs">
          <span
            style={{
              ...textStyles.body,
              fontWeight: fontWeight.bold,
              color: tono.text,
            }}
          >
            {titulo}
          </span>
          <span style={{ ...textStyles.bodySmall, color: colors.gray.dark }}>
            {children}
          </span>
        </div>
        {extra && (
          <span
            style={{
              ...textStyles.caption,
              fontWeight: fontWeight.semibold,
              color: tono.text,
              backgroundColor: colors.background.surface,
              borderRadius: radius.full,
            }}
            className="shrink-0 px-sm py-xxs whitespace-nowrap"
          >
            {extra}
          </span>
        )}
      </div>
    </Card>
  )
}

/**
 * Aviso arriba del detalle cuando cambia qué hay que hacer con el error:
 * marcado como corregido y esperando el resultado del reproceso, reproceso que
 * volvió a fallar, o descartado. En el resto de los estados no muestra nada.
 */
function EstadoAviso({ error }: { error: ErrorDetalle }) {
  if (error.estado === 'REPROCESANDO') {
    const quien = error.corregidoPor
      ? `${error.corregidoPor} lo marcó`
      : 'Se marcó'
    const cuando = error.fechaCorreccion
      ? `${quien} el ${formatDetectedAt(error.fechaCorreccion)} (intento #${error.intentos}). `
      : ''

    return (
      <Aviso
        tono={colors.label.purple}
        icon={<ClockIcon className="h-5 w-5" />}
        titulo="Marcado como corregido · esperando resultado"
        extra={
          error.fechaCorreccion
            ? `Hace ${formatElapsedSince(error.fechaCorreccion)}`
            : undefined
        }
      >
        {cuando}Cuando llegue el nuevo status de Softland pasa a Resuelto (S) o
        vuelve a “A corregir” (E).
      </Aviso>
    )
  }

  if (error.estado === 'REQUIERE_CORRECCION') {
    const [ultimo] = error.intentosReproceso.slice(-1)
    const volvio =
      ultimo?.statusDespues && ultimo.cerradoAt
        ? `Volvió con status ${ultimo.statusDespues} el ${formatDetectedAt(ultimo.cerradoAt)} (intento #${ultimo.numeroIntento}). `
        : ''

    return (
      <Aviso
        tono={colors.label.red}
        icon={<AlertTriangleIcon className="h-5 w-5" />}
        titulo="El reproceso no lo resolvió"
      >
        {volvio}Hay que corregirlo de nuevo en Softland y volver a marcarlo como
        corregido.
      </Aviso>
    )
  }

  if (error.estado === 'DESCARTADO') {
    const [descarte] = error.trazabilidad
      .filter((evento) => evento.tipo === 'descarte')
      .slice(-1)
    const cuando = descarte
      ? `Se descartó el ${formatDetectedAt(descarte.hora)}${descarte.detalle ? ` · ${descarte.detalle}` : ''}. `
      : ''

    return (
      <Aviso
        tono={colors.label.gray}
        icon={<BanIcon className="h-5 w-5" />}
        titulo="Descartado · no interesa"
      >
        {cuando}No aparece en la bandeja ni en el inicio y no se reprocesa. Se
        puede reabrir desde Acciones.
      </Aviso>
    )
  }

  return null
}

export default EstadoAviso
