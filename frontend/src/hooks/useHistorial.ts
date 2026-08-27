import { useCallback, useEffect, useState } from 'react'
import { getHistorial } from '../services/historial.service'
import { getCurrentUser } from '../services/usuarios.service'
import type { HistorialResumen, Usuario } from '../types'

interface HistorialData {
  currentUser: Usuario
  resumen: HistorialResumen
}

interface UseHistorialResult {
  data: HistorialData | null
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useHistorial(): UseHistorialResult {
  const [data, setData] = useState<HistorialData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [currentUser, resumen] = await Promise.all([
          getCurrentUser(),
          getHistorial(),
        ])
        if (!cancelled) {
          setData({ currentUser, resumen })
        }
      } catch {
        if (!cancelled) {
          setError('No pudimos cargar el historial.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [reloadToken])

  const refetch = useCallback(() => setReloadToken((token) => token + 1), [])

  return { data, loading, error, refetch }
}
