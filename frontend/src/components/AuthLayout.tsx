import type { FormEvent, ReactNode } from 'react'
import { colors, fontWeight, radius, spacing, textStyles } from '../styles'
import AuthIlustracion from './AuthIlustracion'
import Button from './Button'

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
      style={{ backgroundColor: '#eef2ec' }}
      className="flex min-h-screen w-full items-center justify-center p-md md:p-xl"
    >
      <div className="grid w-full max-w-[1080px] animate-entrar gap-sm rounded-[2rem] bg-background-surface p-sm shadow-lift md:min-h-[640px] md:grid-cols-[1.05fr_1fr]">
        <PanelMarca />

        <div className="flex items-center justify-center px-md py-xl md:px-xl">
          <div className="flex w-full max-w-[380px] flex-col gap-xl">
            <div className="flex flex-col items-center gap-md text-center">
              <span
                style={{
                  color: colors.gray.white,
                  background: colors.primary.gradient,
                }}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-h4 font-extrabold shadow-md"
              >
                S
              </span>
              <div className="flex flex-col gap-xs">
                <h1 style={{ ...textStyles.h1, color: colors.gray.darkest }}>
                  {titulo}
                </h1>
                <p style={{ ...textStyles.body, color: colors.gray.medium }}>
                  {subtitulo}
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-md">
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
                  className="animate-aparecer rounded-2xl border px-md py-sm"
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
                  borderRadius: radius.full,
                }}
                className="mt-sm w-full"
              />
            </form>

            <p
              style={{ ...textStyles.bodySmall, color: colors.gray.medium }}
              className="text-center"
            >
              {pie}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

/** Mitad verde con la identidad de iFlow. Se oculta en pantallas chicas. */
function PanelMarca() {
  return (
    <div
      style={{
        background: `radial-gradient(120% 90% at 0% 0%, ${colors.brand.forest}, ${colors.brand.deep} 70%)`,
      }}
      className="relative hidden flex-col justify-between overflow-hidden rounded-[1.5rem] p-xl text-white md:flex"
    >
      {/* Trama de puntos muy tenue. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:22px_22px]"
      />

      <div className="relative flex flex-col gap-xxs">
        <span className="text-h3 font-extrabold tracking-tight">
          iFlow
          <span style={{ color: colors.brand.lime }}>.</span>
        </span>
        <span
          style={{ color: colors.brand.limeSoft }}
          className="text-overline font-semibold tracking-[0.3em] uppercase"
        >
          Integrated Logistics Flow
        </span>
      </div>

      <AuthIlustracion className="relative mx-auto my-lg w-full max-w-[340px]" />

      <div className="relative flex flex-col gap-xs">
        <span
          style={{ color: colors.brand.limeSoft }}
          className="text-bodySmall font-semibold tracking-[0.3em] uppercase"
        >
          API Errores
        </span>
        <span className="text-[3.25rem] leading-none font-light tracking-tight">
          Softland
        </span>
      </div>
    </div>
  )
}

export default AuthLayout
