import { useCallback, useEffect, useState } from 'react'
import { getMetricas } from '../services/metricas.service'
import type { Metricas } from '../types'

interface UseMetricasResult {
  data: Metricas | null
  loading: boolean
  error: string | null
  refetch: () => void
}

// Igual que Mi historial: lo último de cada período queda acá para que al
// volver se vea al toque (y se refresque por detrás).
const datosGuardados = new Map<number, Metricas>()

/** Carga las métricas del período; se vuelve a pedir al cambiar `dias`. */
export function useMetricas(dias: number): UseMetricasResult {
  const [data, setData] = useState<Metricas | null>(
    () => datosGuardados.get(dias) ?? null,
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      setData(datosGuardados.get(dias) ?? null)
      try {
        const datos = await getMetricas(dias)
        datosGuardados.set(dias, datos)
        if (!cancelled) setData(datos)
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error
              ? `No pudimos cargar las métricas: ${e.message}`
              : 'No pudimos cargar las métricas.',
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

  return { data, loading, error, refetch }
}
