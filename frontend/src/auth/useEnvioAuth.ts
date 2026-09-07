import { useCallback, useState } from 'react'

/**
 * Estado compartido por los formularios de auth: flag de envío y el error que
 * devolvió la API. Evita repetir el try/catch en Login y Registro.
 */
export function useEnvioAuth() {
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const enviar = useCallback(async (accion: () => Promise<unknown>) => {
    setEnviando(true)
    setError(null)
    try {
      await accion()
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'No pudimos conectarnos con el servidor.',
      )
    } finally {
      setEnviando(false)
    }
  }, [])

  return { enviando, error, enviar }
}
