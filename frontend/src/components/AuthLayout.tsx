import type { FormEvent, ReactNode } from 'react'
import { colors, fontWeight, spacing, textStyles } from '../styles'
import Button from './Button'
import Card from './Card'

interface AuthLayoutProps {
  titulo: string
  subtitulo: string
  /** Los `FormField` del formulario. */
  children: ReactNode
  textoBoton: string
  onSubmit: () => void
  enviando?: boolean
  /** Error que devolvió la API (credenciales, email repetido, red caída…). */
  error?: string | null
  /** Link al otro formulario: "¿No tenés cuenta? Registrate". */
  pie: ReactNode
}

/**
 * Marco compartido por Login y Registro: branding, tarjeta, banner de error y
 * botón de submit. Cada pantalla sólo aporta sus campos.
 */
function AuthLayout({
  titulo,
  subtitulo,
  children,
  textoBoton,
  onSubmit,
  enviando,
  error,
  pie,
}: AuthLayoutProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit()
  }

  return (
    <div
      style={{ backgroundColor: colors.background.page }}
      className="flex min-h-screen w-full items-center justify-center p-lg"
    >
      <div className="flex w-full max-w-[420px] flex-col gap-lg">
        <div className="flex items-center gap-sm">
          <span
            style={{
              color: colors.primary.dark,
              backgroundColor: colors.primary.lightest,
            }}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-body font-bold"
          >
            S
          </span>
          <div className="flex min-w-0 flex-col">
            <span
              style={{
                ...textStyles.body,
                fontWeight: fontWeight.bold,
                color: colors.gray.darkest,
              }}
              className="truncate"
            >
              API Errores Softland
            </span>
            <span
              style={{ ...textStyles.bodySmall, color: colors.gray.medium }}
              className="truncate"
            >
              Softland · Errores
            </span>
          </div>
        </div>

        <Card>
          <div className="flex flex-col gap-xxs">
            <h1 style={{ ...textStyles.h1, color: colors.gray.darkest }}>
              {titulo}
            </h1>
            <p style={{ ...textStyles.bodySmall, color: colors.gray.medium }}>
              {subtitulo}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-lg flex flex-col gap-md">
            {children}

            {error && (
              <div
                role="alert"
                style={{
                  ...textStyles.bodySmall,
                  fontWeight: fontWeight.semibold,
                  backgroundColor: colors.label.red.background,
                  color: colors.label.red.text,
                  borderColor: colors.label.red.outline,
                }}
                className="rounded-lg border px-md py-sm"
              >
                {error}
              </div>
            )}

            <Button
              type="submit"
              text={enviando ? 'Un momento…' : textoBoton}
              color={colors.primary.default}
              disabled={enviando}
              size={{
                ...textStyles.body,
                fontWeight: fontWeight.bold,
                padding: `${spacing.md} ${spacing.lg}`,
              }}
              className="mt-xs w-full"
            />
          </form>
        </Card>

        <p
          style={{ ...textStyles.bodySmall, color: colors.gray.medium }}
          className="text-center"
        >
          {pie}
        </p>
      </div>
    </div>
  )
}

export default AuthLayout
