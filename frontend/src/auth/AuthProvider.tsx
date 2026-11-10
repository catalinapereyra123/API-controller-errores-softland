import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  getPerfil,
  login as loginRequest,
  registrar as registrarRequest,
  urlLoginMicrosoft,
  type CredencialesLogin,
  type DatosRegistro,
} from '../services/auth.service'
import { AuthContext, type AuthContextValue } from './authContext'
import {
  canjearCodigoMicrosoft,
  errorMicrosoft as errorDeLaVuelta,
  hayCodigoMicrosoft,
} from './retornoMicrosoft'
import type { Usuario } from '../types'
import {
  alExpirarSesion,
  borrarToken,
  guardarToken,
  leerToken,
} from './session'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [cargando, setCargando] = useState(
    () => hayCodigoMicrosoft || leerToken() !== null,
  )
  const [errorMicrosoft, setErrorMicrosoft] = useState<string | null>(
    errorDeLaVuelta,
  )

  // Al abrir la app: si se vuelve de Microsoft, se canjea el código por la
  // sesión; si no, con un token guardado se pregunta quién es (si venció,
  // /auth/me devuelve 401 y la sesión se limpia sola).
  useEffect(() => {
    const canje = canjearCodigoMicrosoft()
    if (!canje && !leerToken()) return

    let cancelado = false
    const pedido = canje
      ? canje.then((sesion) => {
          guardarToken(sesion.token)
          return sesion.usuario
        })
      : getPerfil()

    pedido
      .then((perfil) => {
        if (!cancelado) setUsuario(perfil)
      })
      .catch((error: unknown) => {
        if (cancelado) return
        setUsuario(null)
        if (canje) {
          setErrorMicrosoft(
            error instanceof Error
              ? error.message
              : 'No pudimos iniciar sesión con Microsoft.',
          )
        }
      })
      .finally(() => {
        if (!cancelado) setCargando(false)
      })

    return () => {
      cancelado = true
    }
  }, [])

  // Cualquier 401 posterior (token vencido mientras se usaba la app).
  useEffect(() => alExpirarSesion(() => setUsuario(null)), [])

  const iniciarSesion = useCallback(
    async (pedirSesion: () => Promise<{ token: string; usuario: Usuario }>) => {
      const sesion = await pedirSesion()
      guardarToken(sesion.token)
      setUsuario(sesion.usuario)
    },
    [],
  )

  const login = useCallback(
    (credenciales: CredencialesLogin) =>
      iniciarSesion(() => loginRequest(credenciales)),
    [iniciarSesion],
  )

  const registrar = useCallback(
    (datos: DatosRegistro) => iniciarSesion(() => registrarRequest(datos)),
    [iniciarSesion],
  )

  const loginMicrosoft = useCallback(() => {
    setErrorMicrosoft(null)
    window.location.assign(urlLoginMicrosoft())
  }, [])

  const salir = useCallback(() => {
    borrarToken()
    setUsuario(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      usuario,
      cargando,
      login,
      registrar,
      loginMicrosoft,
      errorMicrosoft,
      salir,
    }),
    [
      usuario,
      cargando,
      login,
      registrar,
      loginMicrosoft,
      errorMicrosoft,
      salir,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
