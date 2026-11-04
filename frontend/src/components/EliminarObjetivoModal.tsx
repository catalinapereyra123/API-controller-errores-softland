import { useState } from 'react'
import { formatValor, textoMeta } from '../constants/objetivos'
import { colors, spacing } from '../styles'
import type { Objetivo } from '../types'
import Button from './Button'
import { StarIcon, TargetIcon, TrashIcon } from './icons'
import IrisPopup from './IrisPopup'

interface EliminarObjetivoModalProps {
  objetivo: Objetivo
  /** Sólo NSM: cuántos KR aportan a ella (quedan sueltos al borrarla). */
  krsQueAportan: number
  /** Si falla, tira el error y se muestra acá. */
  onConfirmar: () => Promise<void>
  onClose: () => void
}

/** "¿Seguro que querés eliminar…?" antes de borrar una métrica. */
function EliminarObjetivoModal({
  objetivo,
  krsQueAportan,
  onConfirmar,
  onClose,
}: EliminarObjetivoModalProps) {
  const [eliminando, setEliminando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const esNsm = objetivo.tipo === 'NSM'

  async function eliminar() {
    setEliminando(true)
    setError(null)
    try {
      await onConfirmar()
      onClose()
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'No pudimos eliminar la métrica.',
      )
      setEliminando(false)
    }
  }

  return (
    <IrisPopup
      onClose={() => !eliminando && onClose()}
      tono="peligro"
      icono={<TrashIcon className="h-9 w-9" strokeWidth={2.25} />}
    >
      <span className="inline-flex items-center gap-xs rounded-full bg-label-red-background px-sm py-xxs text-caption font-semibold tracking-wide text-label-red-text uppercase">
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
            ? '¿Seguro que querés eliminar esta North Star?'
            : '¿Seguro que querés eliminar este KR?'}
        </h2>
        <p className="text-body text-gray-medium">
          Se borra con su meta y{' '}
          <b className="font-semibold text-gray-darkest">
            no se puede deshacer
          </b>
          . {/* Mismo largo con o sin KR: el popup no cambia de alto. */}
          {esNsm && krsQueAportan > 0
            ? krsQueAportan === 1
              ? 'El KR que aporta a ella no se borra: queda suelto.'
              : `Los ${krsQueAportan} KR que aportan a ella no se borran: quedan sueltos.`
            : esNsm
              ? 'Si sólo querés dejar de seguirla, ya está pausada: la podés dejar así.'
              : 'Si sólo querés dejar de seguirlo, ya está pausado: lo podés dejar así.'}
        </p>
      </div>

      <div className="flex w-full items-center gap-sm rounded-xl bg-background-subtle px-md py-sm text-left">
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-bodySmall font-semibold text-gray-darkest">
            {objetivo.nombre}
          </span>
          <span className="truncate text-caption text-gray-medium">
            meta {textoMeta(objetivo)} · hoy{' '}
            {formatValor(objetivo.valor, objetivo.unidad)}
          </span>
        </span>
      </div>

      {error && (
        <p
          role="alert"
          className="w-full rounded-xl bg-label-red-background px-md py-sm text-bodySmall font-semibold text-label-red-text"
        >
          {error}
        </p>
      )}

      <div className="mt-xs grid w-full grid-cols-2 gap-sm">
        <Button
          text="Cancelar"
          variant="outline"
          color={colors.gray.medium}
          onClick={onClose}
          disabled={eliminando}
          size={{ padding: `${spacing.sm} ${spacing.lg}` }}
          autoFocus
        />
        <Button
          text={eliminando ? 'Eliminando…' : 'Sí, eliminar'}
          color={colors.status.error}
          icon={<TrashIcon className="h-4 w-4" />}
          onClick={() => void eliminar()}
          disabled={eliminando}
          size={{ padding: `${spacing.sm} ${spacing.lg}` }}
        />
      </div>
    </IrisPopup>
  )
}

export default EliminarObjetivoModal
