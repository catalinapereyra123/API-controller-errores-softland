import { formatValor, textoMeta } from '../constants/objetivos'
import { colors, spacing } from '../styles'
import type { Objetivo } from '../types'
import Button from './Button'
import { ArrowUpRightIcon, CheckIcon, StarIcon, TargetIcon } from './icons'
import IrisPopup from './IrisPopup'

interface ObjetivoCreadoModalProps {
  objetivo: Objetivo
  /** Cierra y lleva a la tarjeta de la métrica. */
  onVer: () => void
  /** Cierra y deja la pantalla como estaba. */
  onClose: () => void
}

/** "Creaste la North Star / el KR": aparece después de un alta. */
function ObjetivoCreadoModal({
  objetivo,
  onVer,
  onClose,
}: ObjetivoCreadoModalProps) {
  const esNsm = objetivo.tipo === 'NSM'

  return (
    <IrisPopup
      onClose={onClose}
      icono={<CheckIcon className="h-9 w-9" strokeWidth={2.5} />}
    >
      <span className="inline-flex items-center gap-xs rounded-full bg-primary-lightest px-sm py-xxs text-caption font-semibold tracking-wide text-primary-dark uppercase">
        {esNsm ? (
          <StarIcon className="h-3.5 w-3.5" />
        ) : (
          <TargetIcon className="h-3.5 w-3.5" />
        )}
        {esNsm ? 'North Star Metric' : 'Key Result'}
      </span>

      <div className="flex flex-col gap-xs">
        <h2 className="text-h3 font-medium text-gray-darkest">
          {esNsm
            ? '¡Creaste la North Star con éxito!'
            : '¡Creaste el KR con éxito!'}
        </h2>
        <p className="text-body text-gray-medium">
          {objetivo.activo
            ? 'Ya se está midiendo: en su tarjeta vas a ver cómo viene contra la meta.'
            : esNsm
              ? 'Quedó pausada: la vas a encontrar en "Pausadas" cuando quieras activarla.'
              : 'Quedó pausado: lo vas a encontrar en "Pausadas" cuando quieras activarlo.'}
        </p>
      </div>

      <div className="flex w-full items-center gap-sm rounded-xl bg-background-subtle px-md py-sm text-left">
        <span
          aria-hidden
          className={
            objetivo.activo
              ? 'h-2 w-2 shrink-0 rounded-full bg-primary-default'
              : 'h-2 w-2 shrink-0 rounded-full bg-gray-default'
          }
        />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-caption font-semibold tracking-wide text-gray-medium uppercase">
            {objetivo.activo ? 'Activa' : 'Pausada'}
          </span>
          <span className="truncate text-bodySmall font-semibold text-gray-darkest">
            {objetivo.nombre}
          </span>
          <span className="truncate text-caption text-gray-medium">
            meta {textoMeta(objetivo)} · hoy{' '}
            {formatValor(objetivo.valor, objetivo.unidad)}
          </span>
        </span>
      </div>

      <div className="mt-xs grid w-full grid-cols-2 gap-sm">
        <Button
          text="Seguir acá"
          variant="outline"
          color={colors.gray.medium}
          onClick={onClose}
          size={{ padding: `${spacing.sm} ${spacing.lg}` }}
        />
        <Button
          text={esNsm ? 'Verla' : 'Verlo'}
          color={colors.primary.default}
          onClick={onVer}
          trailingIcon={<ArrowUpRightIcon className="h-4 w-4" />}
          size={{ padding: `${spacing.sm} ${spacing.lg}` }}
          autoFocus
        />
      </div>
    </IrisPopup>
  )
}

export default ObjetivoCreadoModal
