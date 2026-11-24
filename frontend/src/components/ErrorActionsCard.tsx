import type { ReactNode } from 'react'
import { colors, fontWeight, spacing, textStyles } from '../styles'
import type { ErrorEstado } from '../types'
import Button from './Button'
import Card from './Card'
import { BanIcon, CheckCircleIcon, RefreshIcon, UndoIcon } from './icons'

interface ErrorActionsCardProps {
  estado: ErrorEstado
  /** Status D: se mira, no se reprocesa (el flujo no pasa las D a N). */
  diferencia?: boolean
  /**
   * Comprobante sin CAE: no se reprocesa. "Marcar como corregido" sólo lo
   * cierra en IRIS; si obtiene el CAE, se cierra solo.
   */
  sinCae?: boolean
  /** Sin CAE cerrado a mano (no por el CAE): se puede reabrir. */
  cerradoAMano?: boolean
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
 * se espera el resultado del reproceso sólo se puede consultarlo, un error
 * descartado solo se puede reabrir y una diferencia (D) no se reprocesa.
 */
function ErrorActionsCard({
  estado,
  diferencia = false,
  sinCae = false,
  cerradoAMano = false,
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
          text={sinCae ? 'Reabrir' : 'Reabrir error'}
          color={colors.primary.default}
          icon={<UndoIcon className="h-4 w-4" />}
          onClick={onReopen}
          disabled={disabled}
          size={BOTON_PRINCIPAL}
          className="mt-md w-full"
        />
        <Nota>
          {sinCae
            ? 'Está descartado: no aparece en la lista de Sin CAE y el sync no lo vuelve a abrir. Al reabrirlo vuelve a la lista.'
            : 'Está descartado: no aparece en la bandeja y no se reprocesa. Al reabrirlo vuelve a la bandeja como cualquier otro error.'}
        </Nota>
      </Card>
    )
  }

  if (sinCae) {
    return (
      <AccionesSinCae
        titulo={titulo}
        estado={estado}
        cerradoAMano={cerradoAMano}
        disabled={disabled}
        onMarkAsFixed={onMarkAsFixed}
        onDiscard={onDiscard}
        onReopen={onReopen}
      />
    )
  }

  const esperando = estado === 'REPROCESANDO'

  return (
    <Card>
      {titulo}
      {diferencia && !esperando ? (
        <p
          style={{
            ...textStyles.bodySmall,
            color: colors.label.orange.text,
            backgroundColor: colors.label.orange.background,
          }}
          className="mt-md rounded-2xl px-md py-sm"
        >
          Es una diferencia (status D): se revisa, pero no se reprocesa desde
          IRIS. Corregila en Softland; cuando cambie de status, IRIS la
          actualiza sola.
        </p>
      ) : esperando ? (
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
      {!(diferencia && !esperando) && (
        <Nota>
          {esperando
            ? 'Ya se marcó como corregido. “Consultar nuevo resultado” le pide a Softland el status actual: si ya terminó, pasa a Resuelto (S) o vuelve a “A corregir” (E).'
            : 'Al marcar como corregido, la transacción se reprocesa y vuelve a estado N. Si el reproceso finaliza en S, quedará resuelta. Si no, deberá corregirse nuevamente.'}
        </Nota>
      )}

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

const BOTON_SECUNDARIO = {
  ...textStyles.bodySmall,
  fontWeight: fontWeight.semibold,
  padding: `${spacing.sm} ${spacing.lg}`,
}

/**
 * Acciones de un comprobante sin CAE. Marcarlo como corregido o descartarlo
 * sólo cambia su estado en IRIS: no se reprocesa ni se toca Softland.
 */
function AccionesSinCae({
  titulo,
  estado,
  cerradoAMano,
  disabled,
  onMarkAsFixed,
  onDiscard,
  onReopen,
}: {
  titulo: ReactNode
  estado: ErrorEstado
  cerradoAMano: boolean
  disabled?: boolean
  onMarkAsFixed: () => void
  onDiscard: () => void
  onReopen: () => void
}) {
  const aviso = (texto: string) => (
    <p
      style={{
        ...textStyles.bodySmall,
        color: colors.label.blue.text,
        backgroundColor: colors.label.blue.background,
      }}
      className="mt-md rounded-2xl px-md py-sm"
    >
      {texto}
    </p>
  )

  if (estado === 'RESUELTO') {
    return (
      <Card>
        {titulo}
        {cerradoAMano ? (
          <>
            {aviso('Se marcó como corregido en IRIS.')}
            <Button
              text="Reabrir"
              color={colors.primary.default}
              variant="outline"
              icon={<UndoIcon className="h-4 w-4" />}
              onClick={onReopen}
              disabled={disabled}
              size={BOTON_SECUNDARIO}
              className="mt-md w-full"
            />
            <Nota>
              Al reabrirlo vuelve a la lista de Sin CAE.
            </Nota>
          </>
        ) : (
          aviso('Ya obtuvo el CAE: se cerró solo.')
        )}
      </Card>
    )
  }

  return (
    <Card>
      {titulo}
      {aviso(
        'Se arregla en Softland. Cuando el comprobante obtenga el CAE, IRIS lo cierra solo.',
      )}
      <Button
        text="Marcar como corregido"
        color={colors.primary.default}
        icon={<CheckCircleIcon className="h-4 w-4" />}
        onClick={onMarkAsFixed}
        disabled={disabled}
        size={BOTON_PRINCIPAL}
        className="mt-md w-full"
      />
      <Nota>
        Sólo lo cierra en IRIS: no se reprocesa ni se cambia nada en Softland.
        El sync no lo vuelve a abrir aunque siga sin CAE.
      </Nota>

      <div
        style={{ borderColor: colors.background.border }}
        className="mt-lg border-t pt-md"
      >
        <Button
          text="Descartar"
          color={colors.gray.medium}
          variant="outline"
          icon={<BanIcon className="h-4 w-4" />}
          onClick={onDiscard}
          disabled={disabled}
          size={BOTON_SECUNDARIO}
          className="w-full"
        />
        <Nota>
          Para los que no interesan: sale de la lista de Sin CAE y no vuelve.
          Se puede reabrir.
        </Nota>
      </div>
    </Card>
  )
}

export default ErrorActionsCard
