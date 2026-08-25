import {
  dashboardStatsMock,
  erroresPrioritariosMock,
} from '../mocks/dashboard.mock'
import { mockDelay } from './mockDelay'
import type { DashboardStats, ErrorPrioritario } from '../types'

export async function getDashboardStats(): Promise<DashboardStats> {
  await mockDelay()
  return dashboardStatsMock
  // return api<DashboardStats>('/dashboard/stats')
}

export async function getErroresPrioritarios(): Promise<ErrorPrioritario[]> {
  await mockDelay(350)
  return erroresPrioritariosMock
  // return api<ErrorPrioritario[]>('/errores/prioritarios')
}
