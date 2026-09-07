import AuthLayout from '../components/AuthLayout'
import FormField from '../components/FormField'
import { useAuth } from '../auth/useAuth'
import { useCamposFormulario } from '../auth/useCamposFormulario'
import { useEnvioAuth } from '../auth/useEnvioAuth'
import { validarLogin, type CamposLogin } from '../auth/validaciones'
import { colors, fontWeight } from '../styles'

const CAMPOS_VACIOS: CamposLogin = { email: '', password: '' }

function Login({ onIrARegistro }: { onIrARegistro: () => void }) {
  const { login } = useAuth()
  const { enviando, error, enviar } = useEnvioAuth()
  const { campos, errores, actualizar, validar } =
    useCamposFormulario<CamposLogin>(CAMPOS_VACIOS)

  function handleSubmit() {
    if (!validar(validarLogin)) return

    void enviar(() =>
      login({ email: campos.email.trim(), password: campos.password }),
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
            style={{ color: colors.primary.dark, fontWeight: fontWeight.bold }}
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
