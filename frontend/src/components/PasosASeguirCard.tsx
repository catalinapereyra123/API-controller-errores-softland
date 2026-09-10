import { useState } from 'react'
import { recomendacionPara } from '../constants/recomendaciones'
import {
  colors,
  fontFamily,
  fontWeight,
  radius,
  spacing,
  textStyles,
} from '../styles'
import type { ErrorTransaccion } from '../types'
import Button from './Button'
import Card from './Card'
import { CheckIcon, CopyIcon, LightbulbIcon } from './icons'

interface PasosASeguirCardProps {
  error: ErrorTransaccion
}

/** Ruta o código en monoespaciado, con botón para copiarlo. */
function Copiable({ valor }: { valor: string }) {
  const [copiado, setCopiado] = useState(false)

  async function copiar() {
    try {
      await navigator.clipboard.writeText(valor)
    } catch {
      // Sin acceso al portapapeles (http, permisos): el texto queda
      // seleccionable con un clic.
      return
    }
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  return (
    <div
      style={{
        borderColor: colors.background.border,
        borderRadius: radius.md,
        backgroundColor: colors.background.page,
      }}
      className="mt-xs flex items-center justify-between gap-sm border py-xxs pr-xxs pl-sm"
    >
      <code
        style={{
          ...textStyles.caption,
          fontFamily: fontFamily.mono.join(', '),
          color: colors.gray.darkest,
        }}
        className="min-w-0 break-all select-all"
      >
        {valor}
      </code>
      <Button
        text={copiado ? 'Copiado' : 'Copiar'}
        color={colors.primary.dark}
        variant="text"
        icon={
          copiado ? (
            <CheckIcon className="h-4 w-4" />
          ) : (
            <CopyIcon className="h-4 w-4" />
          )
        }
        onClick={() => void copiar()}
        size={{
          ...textStyles.caption,
          fontWeight: fontWeight.bold,
          padding: `${spacing.xs} ${spacing.sm}`,
        }}
        className="shrink-0"
      />
    </div>
  )
}

/**
 * Qué revisar para destrabar el error, según el mensaje y el status de
 * Softland. Las reglas viven en `constants/recomendaciones`.
 */
function PasosASeguirCard({ error }: PasosASeguirCardProps) {
  const { diagnostico, pasos } = recomendacionPara(error)

  return (
    <Card>
      <div className="flex items-center gap-sm">
        <span
          style={{
            color: colors.label.blue.text,
            backgroundColor: colors.label.blue.background,
          }}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
        >
          <LightbulbIcon className="h-5 w-5" />
        </span>
        <div className="flex min-w-0 flex-col">
          <span style={{ ...textStyles.h3, color: colors.gray.darkest }}>
            Pasos a seguir
          </span>
          <span style={{ ...textStyles.bodySmall, color: colors.gray.medium }}>
            {diagnostico}
          </span>
        </div>
      </div>

      <ol className="mt-lg flex flex-col gap-md">
        {pasos.map((paso, index) => (
          <li key={paso.texto} className="flex gap-sm">
            <span
              style={{
                color: colors.label.blue.text,
                backgroundColor: colors.label.blue.background,
              }}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-caption font-bold"
            >
              {index + 1}
            </span>
            <div className="flex min-w-0 flex-1 flex-col pt-xxs">
              <span style={{ ...textStyles.body, color: colors.gray.dark }}>
                {paso.texto}
              </span>
              {paso.copiable && <Copiable valor={paso.copiable} />}
            </div>
          </li>
        ))}
      </ol>

      <p
        style={{
          ...textStyles.caption,
          color: colors.gray.medium,
          borderColor: colors.background.border,
        }}
        className="mt-lg border-t pt-md"
      >
        Son sugerencias según el mensaje y el status de Softland. Si lo
        resolviste de otra forma, contalo en Observaciones.
      </p>
    </Card>
  )
}

export default PasosASeguirCard
