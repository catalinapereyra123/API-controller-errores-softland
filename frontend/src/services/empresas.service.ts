import { empresasMock } from '../mocks/empresas.mock'
import { mockDelay } from './mockDelay'
import type { Empresa } from '../types'

export async function getEmpresas(): Promise<Empresa[]> {
  await mockDelay()
  return empresasMock
  // return api<Empresa[]>('/empresas')
}
