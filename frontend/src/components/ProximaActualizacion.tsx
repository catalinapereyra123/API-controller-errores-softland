import { useEffect, useState } from 'react'
import { ClockIcon } from './icons'

/** La próxima vez que el reloj pasa por `minuto` (de esta hora o de la siguiente). */
function proxima(minuto: number, ahora: Date): Date {
  const siguiente = new Date(ahora)
  siguiente.setSeconds(0, 0)
  if (ahora.getMinutes() >= minuto) siguiente.setHours(ahora.getHours() + 1)
  siguiente.setMinutes(minuto)
  return siguiente
}

/**
 * Cuándo se vuelven a traer los datos de Softland. Sólo dice la regla y la
 * próxima hora; la última sincronización de cada caso está en su trazabilidad.
 */
function ProximaActualizacion({ minuto }: { minuto: number }) {
  const [ahora, setAhora] = useState(() => new Date())

  useEffect(() => {
    const id = window.setInterval(() => setAhora(new Date()), 30_000)
    return () => window.clearInterval(id)
  }, [])

  const siguiente = proxima(minuto, ahora)
  const hora = [siguiente.getHours(), siguiente.getMinutes()]
    .map((n) => String(n).padStart(2, '0'))
    .join(':')

  return (
    <span
      title="Los datos pueden tardar unos minutos en verse después de esa hora."
      className="flex items-center gap-xs rounded-full bg-background-surface px-md py-xs text-bodySmall text-gray-dark shadow-soft ring-1 ring-slate-900/[0.04]"
    >
      <ClockIcon className="h-4 w-4 shrink-0 text-gray-medium" />
      Se actualiza cada hora
      <span className="text-gray-medium">·</span>
      <span className="font-semibold text-gray-darkest">próxima a las {hora}</span>
    </span>
  )
}

export default ProximaActualizacion
