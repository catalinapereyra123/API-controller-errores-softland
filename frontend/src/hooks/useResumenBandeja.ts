import { useEffect, useState } from 'react'
import { getDashboardStats } from '../services/dashboard.service'
import type { DashboardStats } from '../types'

// Cada pantalla monta su propio sidebar: el resumen se guarda a nivel módulo
// para no pedirlo en cada navegación (se refresca si tiene más de un minuto).
const VIGENCIA_MS = 60_000
let guardado: { stats: DashboardStats; en: number } | null = null

/** Contadores de la bandeja para el sidebar (badge y tarjeta de pendientes). */
export function useResumenBandeja(): DashboardStats | null {
  const [stats, setStats] = useState(guardado?.stats ?? null)

  useEffect(() => {
    if (guardado && Date.now() - guardado.en < VIGENCIA_MS) return
    let cancelado = false
    getDashboardStats()
      .then((nuevas) => {
        guardado = { stats: nuevas, en: Date.now() }
        if (!cancelado) setStats(nuevas)
      })
      // Si falla, el sidebar se muestra sin contadores.
      .catch(() => {})
    return () => {
      cancelado = true
    }
  }, [])

  return stats
}
