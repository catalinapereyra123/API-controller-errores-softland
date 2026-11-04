import { useCallback, useEffect, useState } from 'react'
import {
  actualizarObjetivo,
  borrarObjetivo,
  borrarTodo as borrarTodoApi,
  cargarPropuesta,
  crearObjetivo,
  getObjetivos,
  pausarTodo as pausarTodoApi,
} from '../services/objetivos.service'
import type { Objetivo, ObjetivoInput, Objetivos } from '../types'

interface UseObjetivosResult {
  data: Objetivos | null
  loading: boolean
  error: string | null
  refetch: () => void
  /**
   * Sin `id` crea; con `id` edita. Devuelve cómo quedó la métrica. Si falla,
   * tira el error (lo muestra el form).
   */
  guardar: (input: ObjetivoInput, id?: string) => Promise<Objetivo | null>
  borrar: (id: string) => Promise<void>
  /** Activar / pausar: se ve al toque y se deshace si el back lo rechaza. */
  activar: (id: string, activo: boolean) => void
  usarPropuesta: () => Promise<void>
  /** Acciones masivas: si fallan, tiran el error (lo muestra la confirmación). */
  pausarTodo: () => Promise<void>
  borrarTodo: () => Promise<void>
}

// Como Rendimiento: al volver a la pantalla se ve lo último y se refresca por detrás.
let datosGuardados: Objetivos | null = null

function mensaje(e: unknown, accion: string): string {
  return e instanceof Error
    ? `No pudimos ${accion}: ${e.message}`
    : `No pudimos ${accion}.`
}

/** NSM y KR del equipo, con las acciones de la pantalla Objetivos. */
export function useObjetivos(): UseObjetivosResult {
  const [data, setDataState] = useState<Objetivos | null>(datosGuardados)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  const setData = useCallback((datos: Objetivos) => {
    datosGuardados = datos
    setDataState(datos)
  }, [])

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const datos = await getObjetivos()
        if (!cancelled) setData(datos)
      } catch (e) {
        if (!cancelled) setError(mensaje(e, 'cargar los objetivos'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [reloadToken, setData])

  const refetch = useCallback(() => setReloadToken((token) => token + 1), [])

  const guardar = useCallback(
    async (input: ObjetivoInput, id?: string) => {
      const antes = new Set(datosGuardados?.objetivos.map((o) => o.id))
      const datos = id
        ? await actualizarObjetivo(id, input)
        : await crearObjetivo(input)
      setData(datos)
      setError(null)
      // La respuesta es la lista entera: la nueva es la que no estaba.
      return (
        datos.objetivos.find((o) => (id ? o.id === id : !antes.has(o.id))) ??
        null
      )
    },
    [setData],
  )

  const borrar = useCallback(
    async (id: string) => {
      setData(await borrarObjetivo(id))
      setError(null)
    },
    [setData],
  )

  const activar = useCallback(
    (id: string, activo: boolean) => {
      const antes = datosGuardados
      if (antes) {
        // Activar una North Star pausa la otra (lo hace el back): se refleja ya.
        const esNsm = antes.objetivos.find((o) => o.id === id)?.tipo === 'NSM'
        setDataState({
          ...antes,
          objetivos: antes.objetivos.map((o) =>
            o.id === id
              ? { ...o, activo }
              : activo && esNsm && o.tipo === 'NSM'
                ? { ...o, activo: false }
                : o,
          ),
        })
      }
      actualizarObjetivo(id, { activo })
        .then((datos) => {
          setData(datos)
          setError(null)
        })
        .catch((e: unknown) => {
          if (antes) setData(antes)
          setError(
            mensaje(e, activo ? 'activar la métrica' : 'pausar la métrica'),
          )
        })
    },
    [setData],
  )

  const pausarTodo = useCallback(async () => {
    setData(await pausarTodoApi())
    setError(null)
  }, [setData])

  const borrarTodo = useCallback(async () => {
    setData(await borrarTodoApi())
    setError(null)
  }, [setData])

  const usarPropuesta = useCallback(async () => {
    try {
      setData(await cargarPropuesta())
      setError(null)
    } catch (e) {
      setError(mensaje(e, 'cargar la propuesta'))
    }
  }, [setData])

  return {
    data,
    loading,
    error,
    refetch,
    guardar,
    borrar,
    activar,
    usarPropuesta,
    pausarTodo,
    borrarTodo,
  }
}
