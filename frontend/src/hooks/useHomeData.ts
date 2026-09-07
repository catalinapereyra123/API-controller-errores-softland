import { useCallback, useEffect, useState } from 'react'
import {
  getDashboardStats,
  getErroresPrioritarios,
} from '../services/dashboard.service'
import { getCurrentUser } from '../services/usuarios.service'
import type { DashboardStats, ErrorTransaccion, Usuario } from '../types'

interface HomeData {
  /** null mientras no haya usuarios cargados (todavía no hay auth). */
  currentUser: Usuario | null
  stats: DashboardStats
  erroresPrioritarios: ErrorTransaccion[]
}

interface UseHomeDataResult {
  data: HomeData | null
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useHomeData(): UseHomeDataResult {
  const [data, setData] = useState<HomeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [currentUser, stats, erroresPrioritarios] = await Promise.all([
          getCurrentUser(),
          getDashboardStats(),
          getErroresPrioritarios(),
        ])
        if (!cancelled) {
          setData({ currentUser, stats, erroresPrioritarios })
        }
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error
              ? `No pudimos cargar el dashboard: ${e.message}`
              : 'No pudimos cargar la información del dashboard.',
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
  }, [reloadToken])

  const refetch = useCallback(() => setReloadToken((token) => token + 1), [])

  return { data, loading, error, refetch }
}
