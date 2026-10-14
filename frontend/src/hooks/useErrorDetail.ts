import { useCallback, useEffect, useState } from 'react'
import {
  agregarObservacion,
  asignarResponsable,
  cambiarEstado,
  consultarResultado as consultarResultadoRequest,
  getErrorDetail,
  solicitarReproceso,
} from '../services/errorDetail.service'
import { getUsuarios } from '../services/usuarios.service'
import type { ErrorDetalle, ErrorEstado, Usuario } from '../types'

interface DetalleData {
  usuarios: Usuario[]
  detalle: ErrorDetalle
}

interface UseErrorDetailResult {
  data: DetalleData | null
  loading: boolean
  error: string | null
  refetch: () => void
  /** true mientras corre una acción (asignar, comentar, reprocesar…). */
  saving: boolean
  actionError: string | null
  asignar: (responsableId: string | null) => Promise<void>
  cambiarEstadoManual: (estado: ErrorEstado) => Promise<void>
  observar: (texto: string) => Promise<void>
  reprocesar: (observacion?: string) => Promise<void>
  /** Devuelve el detalle actualizado, o null si falló (queda en actionError). */
  consultarResultado: () => Promise<ErrorDetalle | null>
}

export function useErrorDetail(id: string | null): UseErrorDetailResult {
  const [data, setData] = useState<DetalleData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!id) {
        setData(null)
        setLoading(false)
        setError('No se indicó qué error abrir.')
        return
      }

      setLoading(true)
      setError(null)
      try {
        const [usuarios, detalle] = await Promise.all([
          getUsuarios(),
          getErrorDetail(id),
        ])
        if (!cancelled) setData({ usuarios, detalle })
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error
              ? `No pudimos cargar el detalle: ${e.message}`
              : 'No pudimos cargar el detalle del error.',
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
  }, [id, reloadToken])

  const refetch = useCallback(() => setReloadToken((token) => token + 1), [])

  /**
   * Las mutaciones del back devuelven el detalle ya actualizado, así que se
   * reemplaza en memoria en vez de volver a pedirlo.
   */
  const ejecutar = useCallback(async (accion: () => Promise<ErrorDetalle>) => {
    setSaving(true)
    setActionError(null)
    try {
      const detalle = await accion()
      setData((prev) => (prev ? { ...prev, detalle } : prev))
      return detalle
    } catch (e) {
      setActionError(
        e instanceof Error ? e.message : 'No pudimos guardar el cambio.',
      )
      return null
    } finally {
      setSaving(false)
    }
  }, [])

  const asignar = useCallback(
    async (responsableId: string | null) => {
      await ejecutar(() => asignarResponsable(id!, responsableId))
    },
    [ejecutar, id],
  )

  const cambiarEstadoManual = useCallback(
    async (estado: ErrorEstado) => {
      await ejecutar(() => cambiarEstado(id!, estado))
    },
    [ejecutar, id],
  )

  const observar = useCallback(
    async (texto: string) => {
      await ejecutar(() => agregarObservacion(id!, texto))
    },
    [ejecutar, id],
  )

  const reprocesar = useCallback(
    async (observacion?: string) => {
      await ejecutar(() => solicitarReproceso(id!, observacion))
    },
    [ejecutar, id],
  )

  const consultarResultado = useCallback(
    () => ejecutar(() => consultarResultadoRequest(id!)),
    [ejecutar, id],
  )

  return {
    data,
    loading,
    error,
    refetch,
    saving,
    actionError,
    asignar,
    cambiarEstadoManual,
    observar,
    reprocesar,
    consultarResultado,
  }
}
