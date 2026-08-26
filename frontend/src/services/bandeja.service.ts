import { bandejaErroresMock } from '../mocks/bandejaErrores.mock'
import { mockDelay } from './mockDelay'
import type { ErrorTransaccion } from '../types'

export async function getBandejaErrores(): Promise<ErrorTransaccion[]> {
  await mockDelay(350)
  return [...bandejaErroresMock].sort(
    (a, b) =>
      new Date(b.abiertoDesde).getTime() - new Date(a.abiertoDesde).getTime(),
  )
  // return api<ErrorTransaccion[]>('/errores?sort=-abiertoDesde')
}
