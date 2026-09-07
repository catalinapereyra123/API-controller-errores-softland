import AuthLayout from '../components/AuthLayout'
import FormField from '../components/FormField'
import { useAuth } from '../auth/useAuth'
import { useCamposFormulario } from '../auth/useCamposFormulario'
import { useEnvioAuth } from '../auth/useEnvioAuth'
import {
  LARGO_MINIMO_PASSWORD,
  validarRegistro,
  type CamposRegistro,
} from '../auth/validaciones'
import { colors, fontWeight } from '../styles'

const CAMPOS_VACIOS: CamposRegistro = {
  nombre: '',
  email: '',
  password: '',
  confirmacion: '',
}

function Registro({ onIrALogin }: { onIrALogin: () => void }) {
  const { registrar } = useAuth()
  const { enviando, error, enviar } = useEnvioAuth()
  const { campos, errores, actualizar, validar } =
    useCamposFormulario<CamposRegistro>(CAMPOS_VACIOS)

  function handleSubmit() {
    if (!validar(validarRegistro)) return

    void enviar(() =>
      registrar({
        nombre: campos.nombre.trim(),
        email: campos.email.trim(),
        password: campos.password,
      }),
    )
  }

  return (
    <AuthLayout
      titulo="Crear cuenta"
      subtitulo="Con tu cuenta vas a poder asignarte errores y dejar observaciones."
      textoBoton="Crear cuenta"
      onSubmit={handleSubmit}
      enviando={enviando}
      error={error}
      pie={
        <>
          ¿Ya tenés cuenta?{' '}
          <button
            type="button"
            onClick={onIrALogin}
            style={{ color: colors.primary.dark, fontWeight: fontWeight.bold }}
            className="underline"
          >
            Entrá
          </button>
        </>
      }
    >
      <FormField
        label="Nombre y apellido"
        autoComplete="name"
        placeholder="Catalina Weiss"
        value={campos.nombre}
        error={errores.nombre}
        ayuda="Se usa para firmar las observaciones y la trazabilidad."
        onChange={(event) => actualizar('nombre', event.target.value)}
      />
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
        autoComplete="new-password"
        placeholder="••••••••"
        value={campos.password}
        error={errores.password}
        ayuda={`Mínimo ${LARGO_MINIMO_PASSWORD} caracteres.`}
        onChange={(event) => actualizar('password', event.target.value)}
      />
      <FormField
        label="Repetir contraseña"
        type="password"
        autoComplete="new-password"
        placeholder="••••••••"
        value={campos.confirmacion}
        error={errores.confirmacion}
        onChange={(event) => actualizar('confirmacion', event.target.value)}
      />
    </AuthLayout>
  )
}

export default Registro
