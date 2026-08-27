import { useCallback, useEffect, useState } from 'react'
import { getErrorDetail } from '../services/errorDetail.service'
import { getCurrentUser } from '../services/usuarios.service'
import type { ErrorDetalle, Usuario } from '../types'

interface DetalleData {
  currentUser: Usuario
  detalle: ErrorDetalle
}

interface UseErrorDetailResult {
  data: DetalleData | null
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useErrorDetail(): UseErrorDetailResult {
  const [data, setData] = useState<DetalleData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [currentUser, detalle] = await Promise.all([
          getCurrentUser(),
          getErrorDetail(),
        ])
        if (!cancelled) {
          setData({ currentUser, detalle })
        }
      } catch {
        if (!cancelled) {
          setError('No pudimos cargar el detalle del error.')
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
