import { api } from './api'
import type { Empresa } from '../types'

export function getEmpresas(): Promise<Empresa[]> {
  return api<Empresa[]>('/empresas')
}
