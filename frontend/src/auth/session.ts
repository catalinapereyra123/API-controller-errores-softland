/**
 * Guarda el JWT y avisa cuando la API lo rechaza.
 * Es el único lugar que toca localStorage: `api.ts` lee el token y el
 * AuthContext escucha `alExpirarSesion` para volver al login.
 */

const CLAVE_TOKEN = 'errores-softland:token'

type Listener = () => void
const listeners = new Set<Listener>()

export function leerToken(): string | null {
  try {
    return localStorage.getItem(CLAVE_TOKEN)
  } catch {
    // Modo incógnito o storage bloqueado: se sigue sin sesión persistida.
    return null
  }
}

export function guardarToken(token: string): void {
  try {
    localStorage.setItem(CLAVE_TOKEN, token)
  } catch {
    /* la sesión vive sólo en memoria */
  }
}

export function borrarToken(): void {
  try {
    localStorage.removeItem(CLAVE_TOKEN)
  } catch {
    /* nada que limpiar */
  }
}

/** La llama `api.ts` cuando el backend responde 401. */
export function notificarSesionExpirada(): void {
  borrarToken()
  listeners.forEach((listener) => listener())
}

/** Devuelve la función para desuscribirse. */
export function alExpirarSesion(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
