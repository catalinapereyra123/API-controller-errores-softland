import { useCallback, useEffect, useState } from 'react'
import { getMiEspacio } from '../services/miEspacio.service'
import type { MiEspacio } from '../types'

interface UseMiEspacioResult {
  data: MiEspacio | null
  loading: boolean
  error: string | null
  refetch: () => void
}

// La pantalla se desmonta al abrir un error: los últimos datos de cada período
// quedan acá para que al volver se vea al toque (y se refresque por detrás).
const datosGuardados = new Map<number, MiEspacio>()

/** Carga "Mi espacio" del período pedido; se vuelve a pedir al cambiar `dias`. */
export function useMiEspacio(dias: number): UseMiEspacioResult {
  const [data, setData] = useState<MiEspacio | null>(
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
        const datos = await getMiEspacio(dias)
        datosGuardados.set(dias, datos)
        if (!cancelled) setData(datos)
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error
              ? `No pudimos cargar tu espacio: ${e.message}`
              : 'No pudimos cargar tu espacio.',
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
