import { historialMock } from '../mocks/historial.mock'
import { mockDelay } from './mockDelay'
import type { HistorialResumen } from '../types'

export async function getHistorial(): Promise<HistorialResumen> {
  await mockDelay(300)
  return historialMock
  // return api<HistorialResumen>('/historial')
}
