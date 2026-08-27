import { errorDetailMock } from '../mocks/errorDetail.mock'
import { mockDelay } from './mockDelay'
import type { ErrorDetalle } from '../types'

export async function getErrorDetail(): Promise<ErrorDetalle> {
  await mockDelay(300)
  return errorDetailMock
  // return api<ErrorDetalle>(`/errores/${codigo}`)
}
