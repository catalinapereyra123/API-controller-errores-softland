import { colors } from '../styles'
import { MicrosoftLogo } from './icons'

interface LoginCorporativoProps {
  /** false mientras se pregunta al backend si hay SSO o mientras se navega a Microsoft. */
  listo: boolean
  error: string | null
  onIngresar: () => void
}

/**
 * Login cuando el SSO con Microsoft está prendido: no hay usuario y
 * contraseña, se entra sólo con la cuenta corporativa.
 */
function LoginCorporativo({ listo, error, onIngresar }: LoginCorporativoProps) {
  return (
    <div
      style={{
        background: `radial-gradient(120% 90% at 50% 0%, ${colors.brand.forest}, ${colors.brand.deep} 55%, #060f07)`,
      }}
      className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden px-md py-xl"
    >
      <Ondas />

      <div className="relative flex w-full max-w-[400px] animate-entrar flex-col items-center gap-xl">
        <span className="text-h2 font-medium tracking-tight text-white">
          iFlow<span style={{ color: colors.brand.lime }}>.</span>
        </span>

        <div className="flex w-full flex-col items-center gap-lg rounded-[1.5rem] border border-white/10 bg-white/[0.04] px-lg py-xl text-center shadow-lift backdrop-blur-sm sm:px-xl">
          <div className="flex flex-col items-center gap-xs">
            <span className="text-[3.5rem] leading-none font-medium tracking-tight text-white">
              IRIS<span style={{ color: colors.brand.lime }}>.</span>
            </span>
            <span className="text-bodySmall text-white/65">
              {[
                'Integraciones, ',
                'Reprocesos e ',
                'Incidencias de ',
                'Softland',
              ].map((palabra) => (
                <span key={palabra}>
                  <span
                    style={{ color: colors.brand.lime }}
                    className="font-semibold"
                  >
                    {palabra[0]}
                  </span>
                  {palabra.slice(1)}
                </span>
              ))}
            </span>
          </div>

          <span className="h-px w-12 bg-white/15" />

          <h1 className="text-h4 font-semibold text-white">
            Te damos la bienvenida
          </h1>

          {error && (
            <div
              role="alert"
              className="w-full animate-aparecer rounded-2xl border border-red-300/30 bg-red-500/10 px-md py-sm text-bodySmall font-semibold text-red-200"
            >
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={onIngresar}
            disabled={!listo}
            className="flex w-full items-center justify-center gap-sm rounded-2xl border border-white/20 bg-black/40 px-lg py-md text-body font-semibold text-white transition-colors hover:border-white/40 hover:bg-black/60 disabled:cursor-wait disabled:opacity-60"
          >
            <MicrosoftLogo className="h-5 w-5" />
            {listo ? 'Ingresar con Microsoft' : 'Un momento…'}
          </button>

          <p className="text-bodySmall text-white/55">
            Ingresá con tu cuenta corporativa @iflow21.com.
          </p>
        </div>
      </div>
    </div>
  )
}

/** Líneas onduladas de fondo, muy tenues. */
const ONDAS = Array.from({ length: 34 }, (_, i) => {
  const y = -200 + i * 42
  const amplitud = 60 + (i % 7) * 12
  const puntos: string[] = []
  for (let x = -200; x <= 1800; x += 50) {
    const yy = y + Math.sin(x / 260 + i * 0.35) * amplitud + x * 0.35
    puntos.push(`${x},${yy.toFixed(1)}`)
  }
  return `M${puntos.join(' L')}`
})

function Ondas() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 1600 900"
      preserveAspectRatio="xMidYMid slice"
      className="pointer-events-none absolute inset-0 h-full w-full"
    >
      {ONDAS.map((d, i) => (
        <path
          key={i}
          d={d}
          fill="none"
          stroke={colors.brand.lime}
          strokeOpacity={0.12 + (i % 5) * 0.04}
          strokeWidth={1}
        />
      ))}
    </svg>
  )
}

export default LoginCorporativo
