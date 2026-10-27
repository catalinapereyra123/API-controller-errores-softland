import { useId } from 'react'
import { colors } from '../styles'

interface GaugeProps {
  /** 0–100; null = todavía sin datos. */
  porcentaje: number | null
  etiqueta: string
  color?: string
}

/**
 * Medio aro: la parte llena en verde, lo que falta rayado. El número va en
 * el centro, abajo.
 */
function Gauge({
  porcentaje,
  etiqueta,
  color = colors.primary.default,
}: GaugeProps) {
  const patron = useId()
  const radio = 80
  const largo = Math.PI * radio
  const lleno = ((porcentaje ?? 0) / 100) * largo
  const arco = `M 20 100 A ${radio} ${radio} 0 0 1 180 100`

  return (
    <div className="relative mx-auto w-full max-w-[260px]">
      <svg
        viewBox="0 0 200 112"
        role="img"
        aria-label={`${etiqueta}: ${porcentaje ?? '—'}%`}
        className="w-full"
      >
        <defs>
          <pattern
            id={patron}
            width="6"
            height="6"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <rect width="6" height="6" fill={colors.background.subtle} />
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="6"
              stroke="#cbd5e1"
              strokeWidth="2"
            />
          </pattern>
        </defs>
        <path
          d={arco}
          fill="none"
          stroke={`url(#${patron})`}
          strokeWidth="26"
          strokeLinecap="round"
        />
        {porcentaje !== null && porcentaje > 0 && (
          <path
            d={arco}
            fill="none"
            stroke={color}
            strokeWidth="26"
            strokeLinecap="round"
            strokeDasharray={`${lleno} ${largo}`}
            className="transition-[stroke-dasharray] duration-700"
          />
        )}
      </svg>
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center">
        <span className="text-cifra-sm font-medium tracking-tight text-gray-darkest tabular-nums">
          {porcentaje === null ? '—' : `${porcentaje}%`}
        </span>
        <span className="mt-xxs text-caption text-gray-medium">{etiqueta}</span>
      </div>
    </div>
  )
}

export default Gauge
