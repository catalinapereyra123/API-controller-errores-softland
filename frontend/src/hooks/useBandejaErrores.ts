import { useCallback, useEffect, useMemo, useState } from 'react'
import { getBandejaErrores } from '../services/bandeja.service'
import { getDashboardStats } from '../services/dashboard.service'
import { getEmpresas } from '../services/empresas.service'
import { getCurrentUser, getUsuarios } from '../services/usuarios.service'
import type { Empresa, ErrorTransaccion, Usuario } from '../types'
import { minutesSince } from '../utils/format'

export interface BandejaFilters {
  busqueda: string
  empresaId: string
  modulo: string
  estado: string
  responsableId: string
  periodo: string
}

export const FILTROS_INICIALES: BandejaFilters = {
  busqueda: '',
  empresaId: 'todas',
  modulo: 'todos',
  estado: 'todos',
  responsableId: 'todos',
  periodo: 'todos',
}

const PERIODO_MINUTOS: Record<string, number | null> = {
  todos: null,
  '24h': 60 * 24,
  '7d': 60 * 24 * 7,
  '30d': 60 * 24 * 30,
}

interface BandejaData {
  currentUser: Usuario
  empresas: Empresa[]
  usuarios: Usuario[]
  totalAbiertos: number
  bandejaPendientes: number
  errores: ErrorTransaccion[]
}

interface UseBandejaErroresResult {
  data: BandejaData | null
  erroresFiltrados: ErrorTransaccion[]
  loading: boolean
  error: string | null
  refetch: () => void
  filters: BandejaFilters
  setFilters: (filters: Partial<BandejaFilters>) => void
}

export function useBandejaErrores(): UseBandejaErroresResult {
  const [data, setData] = useState<BandejaData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)
  const [filters, setFiltersState] = useState<BandejaFilters>(FILTROS_INICIALES)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [currentUser, empresas, usuarios, stats, errores] =
          await Promise.all([
            getCurrentUser(),
            getEmpresas(),
            getUsuarios(),
            getDashboardStats(),
            getBandejaErrores(),
          ])
        if (!cancelled) {
          setData({
            currentUser,
            empresas,
            usuarios,
            totalAbiertos: stats.erroresAbiertos,
            bandejaPendientes: stats.bandejaPendientes,
            errores,
          })
        }
      } catch {
        if (!cancelled) {
          setError('No pudimos cargar la bandeja de errores.')
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

  const setFilters = useCallback((partial: Partial<BandejaFilters>) => {
    setFiltersState((prev) => ({ ...prev, ...partial }))
  }, [])

  const erroresFiltrados = useMemo(() => {
    if (!data) return []

    const busqueda = filters.busqueda.trim().toLowerCase()
    const periodoMinutos = PERIODO_MINUTOS[filters.periodo]

    return data.errores.filter((item) => {
      if (busqueda && !item.codigo.toLowerCase().includes(busqueda))
        return false
      if (filters.empresaId !== 'todas' && item.empresaId !== filters.empresaId)
        return false
      if (filters.modulo !== 'todos' && item.modulo !== filters.modulo)
        return false
      if (filters.estado !== 'todos' && item.estado !== filters.estado)
        return false
      if (
        filters.responsableId === 'sin-asignar' &&
        item.responsableId !== null
      )
        return false
      if (
        filters.responsableId !== 'todos' &&
        filters.responsableId !== 'sin-asignar' &&
        item.responsableId !== filters.responsableId
      )
        return false
      if (periodoMinutos && minutesSince(item.abiertoDesde) > periodoMinutos)
        return false
      return true
    })
  }, [data, filters])

  return {
    data,
    erroresFiltrados,
    loading,
    error,
    refetch,
    filters,
    setFilters,
  }
}
