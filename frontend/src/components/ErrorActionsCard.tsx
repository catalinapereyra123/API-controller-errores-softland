import type { ReactNode } from 'react'
import { colors, fontWeight, spacing, textStyles } from '../styles'
import type { ErrorEstado } from '../types'
import Button from './Button'
import Card from './Card'
import { BanIcon, CheckCircleIcon, RefreshIcon, UndoIcon } from './icons'

interface ErrorActionsCardProps {
  estado: ErrorEstado
  /** true mientras se guarda otra acción. */
  disabled?: boolean
  onMarkAsFixed: () => void
  onDiscard: () => void
  onReopen: () => void
  /** Sólo en REPROCESANDO: pide a iFlow el status nuevo de Softland. */
  onConsultarResultado: () => void
  /** true mientras se espera la respuesta de iFlow. */
  consultando?: boolean
  /** Qué pasó con la última consulta (p. ej. "sigue en N"). */
  avisoConsulta?: string | null
}

const BOTON_PRINCIPAL = {
  ...textStyles.body,
  fontWeight: fontWeight.semibold,
  padding: `${spacing.md} ${spacing.lg}`,
}

function Nota({ children }: { children: ReactNode }) {
  return (
    <p
      style={{ ...textStyles.caption, color: colors.gray.medium }}
      className="mt-sm"
    >
      {children}
    </p>
  )
}

/**
 * Bloque de acciones del detalle de error. Cambia según el estado: mientras
 * se espera el resultado del reproceso sólo se puede consultarlo, y un error
 * descartado solo se puede reabrir.
 */
function ErrorActionsCard({
  estado,
  disabled,
  onMarkAsFixed,
  onDiscard,
  onReopen,
  onConsultarResultado,
  consultando,
  avisoConsulta,
}: ErrorActionsCardProps) {
  const titulo = (
    <span style={{ ...textStyles.h3, color: colors.gray.darkest }}>
      Acciones
    </span>
  )

  if (estado === 'DESCARTADO') {
    return (
      <Card>
        {titulo}
        <Button
          text="Reabrir error"
          color={colors.primary.default}
          icon={<UndoIcon className="h-4 w-4" />}
          onClick={onReopen}
          disabled={disabled}
          size={BOTON_PRINCIPAL}
          className="mt-md w-full"
        />
        <Nota>
          Está descartado: no aparece en la bandeja y no se reprocesa. Al
          reabrirlo vuelve a la bandeja como cualquier otro error.
        </Nota>
      </Card>
    )
  }

  const esperando = estado === 'REPROCESANDO'

  return (
    <Card>
      {titulo}
      {esperando ? (
        <Button
          text={consultando ? 'Consultando…' : 'Consultar nuevo resultado'}
          color={colors.label.purple.text}
          icon={
            <RefreshIcon
              className={consultando ? 'h-4 w-4 animate-spin' : 'h-4 w-4'}
            />
          }
          onClick={onConsultarResultado}
          disabled={disabled}
          size={BOTON_PRINCIPAL}
          className="mt-md w-full"
        />
      ) : (
        <Button
          text="Marcar como corregido"
          color={colors.primary.default}
          icon={<CheckCircleIcon className="h-4 w-4" />}
          onClick={onMarkAsFixed}
          disabled={disabled || estado === 'RESUELTO'}
          size={BOTON_PRINCIPAL}
          className="mt-md w-full"
        />
      )}
      {esperando && avisoConsulta && (
        <p
          role="status"
          style={{
            ...textStyles.bodySmall,
            fontWeight: fontWeight.semibold,
            color: colors.label.purple.text,
            backgroundColor: colors.label.purple.background,
          }}
          className="mt-sm rounded-2xl px-md py-sm"
        >
          {avisoConsulta}
        </p>
      )}
      <Nota>
        {esperando
          ? 'Ya se marcó como corregido. “Consultar nuevo resultado” le pide a Softland el status actual: si ya terminó, pasa a Resuelto (S) o vuelve a “A corregir” (E).'
          : 'Al marcar como corregido, la transacción se reprocesa y vuelve a estado N. Si el reproceso finaliza en S, quedará resuelta. Si no, deberá corregirse nuevamente.'}
      </Nota>

      {estado !== 'RESUELTO' && (
        <div
          style={{ borderColor: colors.background.border }}
          className="mt-lg border-t pt-md"
        >
          <Button
            text="Descartar error"
            color={colors.gray.medium}
            variant="outline"
            icon={<BanIcon className="h-4 w-4" />}
            onClick={onDiscard}
            disabled={disabled}
            size={{
              ...textStyles.bodySmall,
              fontWeight: fontWeight.semibold,
              padding: `${spacing.sm} ${spacing.lg}`,
            }}
            className="w-full"
          />
          <Nota>
            Para errores viejos o de prueba que no interesan: sale de la bandeja
            y no se reprocesa. Se puede reabrir.
          </Nota>
        </div>
      )}
    </Card>
  )
}

export default ErrorActionsCard
