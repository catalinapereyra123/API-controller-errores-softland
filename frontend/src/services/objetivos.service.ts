import { api, apiDelete, apiPatch, apiPost } from './api'
import type { ObjetivoInput, Objetivos } from '../types'

// Cada cambio devuelve la lista entera recalculada.

export function getObjetivos(): Promise<Objetivos> {
  return api<Objetivos>('/objetivos')
}

export function crearObjetivo(input: ObjetivoInput): Promise<Objetivos> {
  return apiPost<Objetivos>('/objetivos', input)
}

export function actualizarObjetivo(
  id: string,
  cambios: Partial<ObjetivoInput>,
): Promise<Objetivos> {
  return apiPatch<Objetivos>(`/objetivos/${id}`, cambios)
}

export function borrarObjetivo(id: string): Promise<Objetivos> {
  return apiDelete<Objetivos>(`/objetivos/${id}`)
}

/** La NSM y los KR sugeridos; sólo funciona si todavía no hay ninguno. */
export function cargarPropuesta(): Promise<Objetivos> {
  return apiPost<Objetivos>('/objetivos/propuesta')
}

/** Pausa la NSM y todos los KR (quedan guardados). */
export function pausarTodo(): Promise<Objetivos> {
  return apiPost<Objetivos>('/objetivos/pausar-todo')
}

/** Borra la NSM y todos los KR. */
export function borrarTodo(): Promise<Objetivos> {
  return apiDelete<Objetivos>('/objetivos')
}
