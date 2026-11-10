import { canjearSesionMicrosoft } from '../services/auth.service'
import type { Sesion } from '../types'

/**
 * Vuelta del login con Microsoft: el backend redirige a la app con `?ms=ok`
 * (el código para pedir la sesión quedó en una cookie httpOnly) o con
 * `?ms_error=<motivo>`.
 *
 * Se lee una sola vez al cargar el módulo y se limpia la URL enseguida, así
 * no queda en el historial ni se canjea dos veces (React en modo estricto
 * corre los efectos dos veces y el código sirve una sola).
 */
const params = new URLSearchParams(window.location.search)
const volvioOk = params.get('ms') === 'ok'
const motivo = params.get('ms_error')

if (params.has('ms') || motivo !== null) {
  params.delete('ms')
  params.delete('ms_error')
  const resto = params.toString()
  window.history.replaceState(
    window.history.state,
    '',
    `${window.location.pathname}${resto ? `?${resto}` : ''}${window.location.hash}`,
  )
}

/**
 * Textos fijos por motivo: la URL sólo elige cuál mostrar, así nadie puede
 * mandar un link que muestre un mensaje inventado en el login.
 */
const MENSAJES: Record<string, string> = {
  denegado:
    'Microsoft no autorizó el ingreso. Si no lo cancelaste vos, pedí acceso a IRIS.',
  vencido:
    'El ingreso con Microsoft venció o se abrió en otra pestaña. Probá de nuevo.',
  dominio: 'Sólo se puede entrar con una cuenta corporativa @iflow21.com.',
  vinculada:
    'Ese email ya está vinculado a otra cuenta de Microsoft. Pedí ayuda a soporte.',
  fallo: 'No pudimos iniciar sesión con Microsoft. Probá de nuevo.',
}

let canje: Promise<Sesion> | null = null

/** true si la app se abrió volviendo de Microsoft con una sesión para pedir. */
export const hayCodigoMicrosoft = volvioOk

/** Por qué falló el ingreso con Microsoft, ya como texto para mostrar. */
export const errorMicrosoft =
  motivo === null ? null : (MENSAJES[motivo] ?? MENSAJES.fallo)

/** Pide la sesión (una sola vez, aunque se llame de nuevo). */
export function canjearCodigoMicrosoft(): Promise<Sesion> | null {
  if (!volvioOk) return null
  canje ??= canjearSesionMicrosoft()
  return canje
}
