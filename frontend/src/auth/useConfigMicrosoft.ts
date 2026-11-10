import { useEffect, useState } from 'react'
import { getSsoMicrosoft } from '../services/auth.service'

/**
 * Pregunta al backend si el SSO con Microsoft está prendido: `undefined`
 * mientras carga, `false` si no lo está y el login muestra email/contraseña.
 *
 * Si la pregunta falla (backend reiniciándose), en el build de producción se
 * asume que sí: ahí el SSO está siempre prendido y el formulario de
 * contraseña sólo devolvería 403.
 */
export function useSsoMicrosoft(): boolean | undefined {
  const [activo, setActivo] = useState<boolean | undefined>(undefined)

  useEffect(() => {
    let cancelado = false
    getSsoMicrosoft()
      .then((respuesta) => {
        if (!cancelado) setActivo(respuesta)
      })
      .catch(() => {
        if (!cancelado) setActivo(import.meta.env.PROD)
      })
    return () => {
      cancelado = true
    }
  }, [])

  return activo
}
