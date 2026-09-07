import { api } from './api'
import type { HistorialResumen } from '../types'

export function getHistorial(): Promise<HistorialResumen> {
  return api<HistorialResumen>('/historial')
}
