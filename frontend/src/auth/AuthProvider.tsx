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
  type CredencialesLogin,
  type DatosRegistro,
} from '../services/auth.service'
import { AuthContext, type AuthContextValue } from './authContext'
import type { Usuario } from '../types'
import {
  alExpirarSesion,
  borrarToken,
  guardarToken,
  leerToken,
} from './session'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [cargando, setCargando] = useState(() => leerToken() !== null)

  // Al abrir la app con un token guardado se pregunta quién es: si el token
  // venció, /auth/me devuelve 401 y la sesión se limpia sola.
  useEffect(() => {
    if (!leerToken()) return

    let cancelado = false
    getPerfil()
      .then((perfil) => {
        if (!cancelado) setUsuario(perfil)
      })
      .catch(() => {
        if (!cancelado) setUsuario(null)
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

  const salir = useCallback(() => {
    borrarToken()
    setUsuario(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ usuario, cargando, login, registrar, salir }),
    [usuario, cargando, login, registrar, salir],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
