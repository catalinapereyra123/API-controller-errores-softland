import { useContext } from 'react'
import { AuthContext, type AuthContextValue } from './authContext'

/** Sesión actual. Falla fuerte si se usa afuera del AuthProvider. */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth tiene que usarse dentro de <AuthProvider>.')
  }
  return context
}
