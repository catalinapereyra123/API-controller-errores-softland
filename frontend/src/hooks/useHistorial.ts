import { useCallback, useEffect, useState } from 'react'
import { getHistorial } from '../services/historial.service'
import type { HistorialResumen } from '../types'

interface UseHistorialResult {
  resumen: HistorialResumen | null
  loading: boolean
  error: string | null
  refetch: () => void
}

/** Carga el historial del período pedido; se vuelve a pedir al cambiar `dias`. */
export function useHistorial(dias: number): UseHistorialResult {
  const [resumen, setResumen] = useState<HistorialResumen | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const datos = await getHistorial(dias)
        if (!cancelled) setResumen(datos)
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error
              ? `No pudimos cargar el historial: ${e.message}`
              : 'No pudimos cargar el historial.',
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [dias, reloadToken])

  const refetch = useCallback(() => setReloadToken((token) => token + 1), [])

  return { resumen, loading, error, refetch }
}
