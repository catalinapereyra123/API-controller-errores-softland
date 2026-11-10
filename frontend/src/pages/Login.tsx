import { useEffect, useState } from 'react'
import AuthLayout from '../components/AuthLayout'
import FormField from '../components/FormField'
import LoginCorporativo from '../components/LoginCorporativo'
import { useAuth } from '../auth/useAuth'
import { useCamposFormulario } from '../auth/useCamposFormulario'
import { useSsoMicrosoft } from '../auth/useConfigMicrosoft'
import { useEnvioAuth } from '../auth/useEnvioAuth'
import { validarLogin, type CamposLogin } from '../auth/validaciones'
import { colors, fontWeight } from '../styles'

const CAMPOS_VACIOS: CamposLogin = { email: '', password: '' }

/**
 * Con Azure configurado se entra sólo con Microsoft (el backend también corta
 * el login con contraseña y el registro). Sin Azure (local), email y contraseña.
 */
function Login({ onIrARegistro }: { onIrARegistro: () => void }) {
  const { login, loginMicrosoft, errorMicrosoft } = useAuth()
  const ssoMicrosoft = useSsoMicrosoft()
  const [yendoAMicrosoft, setYendoAMicrosoft] = useState(false)
  const { enviando, error, enviar } = useEnvioAuth()

  // Si se vuelve con "Atrás" desde Microsoft, el navegador restaura la página
  // tal cual quedó (con el botón en "Un momento…"): se lo vuelve a habilitar.
  useEffect(() => {
    function alVolver(event: PageTransitionEvent) {
      if (event.persisted) setYendoAMicrosoft(false)
    }
    window.addEventListener('pageshow', alVolver)
    return () => window.removeEventListener('pageshow', alVolver)
  }, [])
  const { campos, errores, actualizar, validar } =
    useCamposFormulario<CamposLogin>(CAMPOS_VACIOS)

  function handleSubmit() {
    if (!validar(validarLogin)) return

    void enviar(() =>
      login({ email: campos.email.trim(), password: campos.password }),
    )
  }

  // Mientras se pregunta si hay SSO se muestra la pantalla corporativa (es la
  // de producción); sólo sin Azure aparece el formulario.
  if (ssoMicrosoft !== false) {
    return (
      <LoginCorporativo
        listo={ssoMicrosoft === true && !yendoAMicrosoft}
        error={errorMicrosoft}
        onIngresar={() => {
          setYendoAMicrosoft(true)
          loginMicrosoft()
        }}
      />
    )
  }

  return (
    <AuthLayout
      titulo="Entrar"
      subtitulo="Ingresá con tu cuenta para ver la bandeja de errores."
      textoBoton="Entrar"
      onSubmit={handleSubmit}
      enviando={enviando}
      error={error}
      pie={
        <>
          ¿Todavía no tenés cuenta?{' '}
          <button
            type="button"
            onClick={onIrARegistro}
            style={{
              color: colors.primary.dark,
              fontWeight: fontWeight.semibold,
            }}
            className="underline"
          >
            Creá una
          </button>
        </>
      }
    >
      <FormField
        label="Email"
        type="email"
        autoComplete="email"
        placeholder="vos@empresa.com"
        value={campos.email}
        error={errores.email}
        onChange={(event) => actualizar('email', event.target.value)}
      />
      <FormField
        label="Contraseña"
        type="password"
        autoComplete="current-password"
        placeholder="••••••••"
        value={campos.password}
        error={errores.password}
        onChange={(event) => actualizar('password', event.target.value)}
      />
    </AuthLayout>
  )
}

export default Login
