import { colors, spacing } from '../styles'
import type { Objetivo } from '../types'
import Button from './Button'
import { ArrowUpRightIcon, StarIcon } from './icons'
import IrisPopup from './IrisPopup'

interface NorthStarActivaModalProps {
  /** La que se quiso activar. */
  nueva: Objetivo
  /** La que ya está activa. */
  actual: Objetivo
  /** Pausa la actual y activa la nueva. */
  onReemplazar: () => void
  /** Cierra y lleva a la tarjeta de la actual. */
  onVerActual: () => void
  /** Cierra sin cambiar nada (la X, Escape o un clic afuera). */
  onClose: () => void
}

/**
 * Sólo puede haber una North Star activa: al querer activar otra se explica
 * y se ofrece cambiarla.
 */
function NorthStarActivaModal({
  nueva,
  actual,
  onReemplazar,
  onVerActual,
  onClose,
}: NorthStarActivaModalProps) {
  return (
    <IrisPopup
      onClose={onClose}
      tono="aviso"
      icono={<StarIcon className="h-9 w-9" />}
    >
      <span className="inline-flex items-center gap-xs rounded-full bg-label-orange-background px-sm py-xxs text-caption font-semibold tracking-wide text-label-orange-text uppercase">
        <StarIcon className="h-3.5 w-3.5" />
        Una North Star a la vez
      </span>

      <div className="flex flex-col gap-xs">
        <h2 className="text-h3 font-medium text-gray-darkest">
          Ya hay una North Star activa
        </h2>
        <p className="text-body text-gray-medium">
          No puede haber más de una activa a la vez. Mirá la actual o pausala
          para activar esta.
        </p>
      </div>

      <dl className="w-full divide-y divide-background-border rounded-xl bg-background-subtle text-left">
        <Fila etiqueta="Activa ahora" nombre={actual.nombre} activa />
        <Fila etiqueta="Querés activar" nombre={nueva.nombre} />
      </dl>

      <div className="grid w-full grid-cols-2 gap-sm">
        <Button
          text="Ver la actual"
          variant="outline"
          color={colors.gray.medium}
          onClick={onVerActual}
          trailingIcon={<ArrowUpRightIcon className="h-4 w-4" />}
          size={{ padding: `${spacing.sm} ${spacing.md}` }}
        />
        <Button
          text="Cambiar por esta"
          color={colors.primary.default}
          onClick={onReemplazar}
          size={{ padding: `${spacing.sm} ${spacing.md}` }}
          autoFocus
        />
      </div>
    </IrisPopup>
  )
}

function Fila({
  etiqueta,
  nombre,
  activa = false,
}: {
  etiqueta: string
  nombre: string
  activa?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-md px-md py-sm">
      <dt className="flex shrink-0 items-center gap-xs text-caption text-gray-medium">
        <span
          aria-hidden
          className={
            activa
              ? 'h-2 w-2 rounded-full bg-primary-default'
              : 'h-2 w-2 rounded-full bg-gray-default'
          }
        />
        {etiqueta}
      </dt>
      <dd className="truncate text-bodySmall font-semibold text-gray-darkest">
        {nombre}
      </dd>
    </div>
  )
}

export default NorthStarActivaModal
