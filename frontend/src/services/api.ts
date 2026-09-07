import { leerToken, notificarSesionExpirada } from '../auth/session'

const API_URL = (
  import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
).replace(/\/$/, '')

/** Rutas que no llevan token ni disparan el "sesión expirada". */
const RUTAS_PUBLICAS = ['/auth/login', '/auth/registro']

async function request<T>(
  path: string,
  method = 'GET',
  body?: unknown,
): Promise<T> {
  const esPublica = RUTAS_PUBLICAS.includes(path)
  const token = esPublica ? null : leerToken()

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })

  if (!res.ok) {
    // 401 en una ruta privada = token vencido o inválido: se cierra la sesión
    // y el AuthContext manda al login.
    if (res.status === 401 && !esPublica) notificarSesionExpirada()
    throw new Error(await mensajeDeError(res))
  }

  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

/** Nest manda `{ message }` (string o array); si no se puede leer, queda el status. */
async function mensajeDeError(res: Response): Promise<string> {
  const detalle = await res
    .json()
    .then((data: { message?: string | string[] }) =>
      Array.isArray(data?.message) ? data.message.join(' ') : data?.message,
    )
    .catch(() => null)
  return detalle ?? `API error ${res.status}: ${res.statusText}`
}

export function api<T>(path: string): Promise<T> {
  return request<T>(path)
}

export function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, 'POST', body)
}

export function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, 'PATCH', body)
}

/** Arma un querystring salteando los valores vacíos. */
export function qs(params: Record<string, string | undefined>): string {
  const entries = Object.entries(params).filter(
    (entry): entry is [string, string] => Boolean(entry[1]),
  )
  if (!entries.length) return ''
  return `?${new URLSearchParams(entries).toString()}`
}
