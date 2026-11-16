import { useEffect, useState } from 'react'
import { getResumenSinCae } from '../services/sinCae.service'
import type { ResumenSinCae } from '../types'

// Igual que useResumenBandeja: cada pantalla monta su sidebar, así que el
// resumen se guarda a nivel módulo y se refresca si tiene más de un minuto.
const VIGENCIA_MS = 60_000
let guardado: { resumen: ResumenSinCae; en: number } | null = null

/** Contador de comprobantes sin CAE abiertos para el ítem del menú. */
export function useResumenSinCae(): ResumenSinCae | null {
  const [resumen, setResumen] = useState(guardado?.resumen ?? null)

  useEffect(() => {
    if (guardado && Date.now() - guardado.en < VIGENCIA_MS) return
    let cancelado = false
    getResumenSinCae()
      .then((nuevo) => {
        guardado = { resumen: nuevo, en: Date.now() }
        if (!cancelado) setResumen(nuevo)
      })
      // Si falla, el ítem se muestra sin contador.
      .catch(() => {})
    return () => {
      cancelado = true
    }
  }, [])

  return resumen
}
