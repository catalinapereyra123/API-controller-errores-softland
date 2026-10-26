import { useCallback, useEffect, useMemo, useState } from 'react'
import { ESTADOS_CERRADOS, esExcluida } from '../constants/estados'
import { getBandejaErrores } from '../services/bandeja.service'
import { getDashboardStats } from '../services/dashboard.service'
import { getEmpresas } from '../services/empresas.service'
import { getUsuarios } from '../services/usuarios.service'
import type { Empresa, ErrorTransaccion, Usuario } from '../types'
import { minutesSince } from '../utils/format'

export interface BandejaFilters {
  busqueda: string
  empresaId: string
  modulo: string
  /** 'abiertos' | 'todos' | un ErrorEstado puntual. */
  estado: string
  responsableId: string
  periodo: string
}

export const FILTROS_INICIALES: BandejaFilters = {
  busqueda: '',
  empresaId: 'todas',
  modulo: 'todos',
  estado: 'abiertos',
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
  /** Cuántos quedan por empresa con el resto de los filtros; clave 'todas' = total. */
  conteoPorEmpresa: Record<string, number>
  filters: BandejaFilters
  setFilters: (filters: Partial<BandejaFilters>) => void
}

// La bandeja se desmonta al abrir un error: los filtros y los últimos datos
// viven a nivel módulo para que al volver quede como estaba (los datos se
// muestran al toque y se refrescan por detrás). Los filtros además van a
// sessionStorage, así sobreviven a una recarga de la pestaña.
const CLAVE_FILTROS = 'errores-softland:filtros-bandeja'

function leerFiltros(): BandejaFilters {
  try {
    const guardados = sessionStorage.getItem(CLAVE_FILTROS)
    return guardados
      ? { ...FILTROS_INICIALES, ...(JSON.parse(guardados) as BandejaFilters) }
      : FILTROS_INICIALES
  } catch {
    return FILTROS_INICIALES
  }
}

function guardarFiltros(filtros: BandejaFilters) {
  filtrosGuardados = filtros
  try {
    sessionStorage.setItem(CLAVE_FILTROS, JSON.stringify(filtros))
  } catch {
    // Sin storage (modo privado, cuota): quedan sólo en memoria.
  }
}

let filtrosGuardados: BandejaFilters = leerFiltros()
let datosGuardados: BandejaData | null = null

export function useBandejaErrores(): UseBandejaErroresResult {
  const [data, setData] = useState<BandejaData | null>(datosGuardados)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)
  const [filters, setFiltersState] = useState<BandejaFilters>(filtrosGuardados)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        // Se trae todo (también resueltos y descartados) y se filtra en el
        // cliente, así los filtros responden sin ida y vuelta al servidor.
        const [empresas, usuarios, stats, errores] = await Promise.all([
          getEmpresas(),
          getUsuarios(),
          getDashboardStats(),
          getBandejaErrores({ soloAbiertos: 'false' }),
        ])
        if (!cancelled) {
          datosGuardados = {
            empresas,
            usuarios,
            totalAbiertos: stats.erroresAbiertos,
            bandejaPendientes: stats.bandejaPendientes,
            errores,
          }
          setData(datosGuardados)
        }
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error
              ? `No pudimos cargar la bandeja: ${e.message}`
              : 'No pudimos cargar la bandeja de errores.',
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

  const setFilters = useCallback((partial: Partial<BandejaFilters>) => {
    setFiltersState((prev) => {
      guardarFiltros({ ...prev, ...partial })
      return filtrosGuardados
    })
  }, [])

  // Sin el filtro de empresa: de acá salen tanto la lista como los contadores
  // de cada pestaña de empresa.
  const sinFiltroEmpresa = useMemo(() => {
    if (!data) return []

    const busqueda = filters.busqueda.trim().toLowerCase()
    const periodoMinutos = PERIODO_MINUTOS[filters.periodo]

    return data.errores.filter((item) => {
      if (
        busqueda &&
        !item.codigo.toLowerCase().includes(busqueda) &&
        !item.descripcion.toLowerCase().includes(busqueda)
      )
        return false
      if (filters.modulo !== 'todos' && item.moduloCodigo !== filters.modulo)
        return false
      if (
        filters.estado === 'abiertos' &&
        ESTADOS_CERRADOS.includes(item.estado)
      )
        return false
      if (
        filters.estado !== 'abiertos' &&
        filters.estado !== 'todos' &&
        item.estado !== filters.estado
      )
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

  const erroresFiltrados = useMemo(
    () =>
      filters.empresaId === 'todas'
        ? sinFiltroEmpresa
        : sinFiltroEmpresa.filter(
            (item) => item.empresaId === filters.empresaId,
          ),
    [sinFiltroEmpresa, filters.empresaId],
  )

  // Los excluidos (status X) se ven en la lista pero no suman en las pestañas.
  const conteoPorEmpresa = useMemo(() => {
    const errores = sinFiltroEmpresa.filter((item) => !esExcluida(item))
    const conteo: Record<string, number> = { todas: errores.length }
    for (const item of errores) {
      conteo[item.empresaId] = (conteo[item.empresaId] ?? 0) + 1
    }
    return conteo
  }, [sinFiltroEmpresa])

  return {
    data,
    erroresFiltrados,
    conteoPorEmpresa,
    loading,
    error,
    refetch,
    filters,
    setFilters,
  }
}
