const API_URL = (
  import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
).replace(/\/$/, '')

async function request<T>(
  path: string,
  method = 'GET',
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })

  if (!res.ok) {
    // Nest manda { message } en los errores; si no se puede leer, queda el status.
    const detalle = await res
      .json()
      .then((data: { message?: string | string[] }) =>
        Array.isArray(data?.message) ? data.message.join(', ') : data?.message,
      )
      .catch(() => null)
    throw new Error(detalle ?? `API error ${res.status}: ${res.statusText}`)
  }

  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
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
