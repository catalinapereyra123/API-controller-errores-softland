import { useCallback, useEffect, useState } from 'react'
import { getBandejaErrores } from '../services/bandeja.service'
import {
  getDashboardStats,
  getErroresPrioritarios,
} from '../services/dashboard.service'
import { getHistorial } from '../services/historial.service'
import { getMetricas } from '../services/metricas.service'
import type {
  DashboardStats,
  ErrorTransaccion,
  HistorialEvento,
  Metricas,
} from '../types'

interface HomeData {
  stats: DashboardStats
  erroresPrioritarios: ErrorTransaccion[]
  /** Lo abierto en la bandeja: de acá salen la composición por estado y empresa. */
  abiertos: ErrorTransaccion[]
  /** Métricas de los últimos 7 días; null si no se pudieron traer. */
  semana: Metricas | null
  /** Últimos movimientos de los últimos 30 días, el más reciente primero. */
  movimientos: HistorialEvento[]
}

interface UseHomeDataResult {
  data: HomeData | null
  loading: boolean
  error: string | null
  refetch: () => void
}

// Al volver al inicio se muestra lo último al toque y se refresca por detrás.
let datosGuardados: HomeData | null = null

export function useHomeData(): UseHomeDataResult {
  const [data, setData] = useState<HomeData | null>(datosGuardados)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        // Semana y movimientos son extras: si fallan, el inicio igual carga.
        const [stats, erroresPrioritarios, abiertos, semana, historial] =
          await Promise.all([
            getDashboardStats(),
            getErroresPrioritarios(),
            getBandejaErrores(),
            getMetricas(7).catch(() => null),
            getHistorial(30).catch(() => null),
          ])
        datosGuardados = {
          stats,
          erroresPrioritarios,
          abiertos,
          semana,
          movimientos: (historial?.dias ?? [])
            .flatMap((dia) => dia.eventos)
            .slice(0, 6),
        }
        if (!cancelled) setData(datosGuardados)
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
