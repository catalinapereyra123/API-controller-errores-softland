import { useState } from 'react'
import { colors } from '../styles'
import { cn } from '../utils/cn'

export interface BarraPunto {
  id: string
  etiqueta: string
  valor: number
  /** Texto del tooltip; por defecto, la etiqueta. */
  detalle?: string
}

interface BarChartProps {
  puntos: BarraPunto[]
  /** Qué mide (accesibilidad y tooltip): "llegadas", "resoluciones"… */
  unidad: string
  color?: string
  height?: number
  className?: string
}

/** Escala "linda" para el eje: 1, 2, 5, 10, 20, 50… */
function techo(max: number): number {
  if (max <= 4) return 4
  const paso = 10 ** Math.floor(Math.log10(max))
  for (const m of [1, 2, 2.5, 5, 10]) {
    if (m * paso >= max) return m * paso
  }
  return 10 * paso
}

/**
 * Barras redondeadas tipo pastilla. La más alta (o la que tiene el mouse)
 * va llena con su valor arriba; el resto, rayadas. Con muchos puntos sólo se
 * etiquetan algunos en el eje para que no se pisen.
 */
function BarChart({
  puntos,
  unidad,
  color = colors.primary.default,
  height = 240,
  className,
}: BarChartProps) {
  const [activo, setActivo] = useState<string | null>(null)
  const max = Math.max(0, ...puntos.map((p) => p.valor))
  const escala = techo(max)
  const pico = puntos.find((p) => p.valor === max && max > 0)?.id ?? null
  const resaltado = activo ?? pico
  const cadaCuanto = Math.ceil(puntos.length / 12)
  const lineas = [1, 0.5, 0]

  return (
    <div className={cn('flex w-full gap-sm', className)}>
      {/* Eje Y: tres valores de referencia. */}
      <div
        aria-hidden
        style={{ height }}
        className="flex shrink-0 flex-col justify-between pb-lg text-right text-caption text-gray-default tabular-nums"
      >
        {lineas.map((f) => (
          <span key={f} className="-translate-y-1/2 leading-none">
            {Math.round(escala * f)}
          </span>
        ))}
      </div>

      <div className="relative min-w-0 flex-1">
        <div
          aria-hidden
          style={{ height }}
          className="pointer-events-none absolute inset-x-0 top-0 flex flex-col justify-between pb-lg"
        >
          {lineas.map((f) => (
            <span
              key={f}
              className={cn(
                'block w-full border-t',
                f === 0
                  ? 'border-background-border'
                  : 'border-dashed border-background-border/80',
              )}
            />
          ))}
        </div>

        <ul
          role="list"
          aria-label={`Gráfico de ${unidad}`}
          style={{ height }}
          onMouseLeave={() => setActivo(null)}
          className={cn(
            'relative flex items-stretch',
            puntos.length > 40
              ? 'gap-px'
              : puntos.length > 16
                ? 'gap-xxs'
                : 'gap-sm',
          )}
        >
          {puntos.map((p, index) => {
            const esResaltado = p.id === resaltado
            const alto = escala ? (p.valor / escala) * 100 : 0
            const conEtiqueta =
              index % cadaCuanto === 0 || index === puntos.length - 1

            return (
              <li
                key={p.id}
                aria-label={`${p.detalle ?? p.etiqueta}: ${p.valor} ${unidad}`}
                onMouseEnter={() => setActivo(p.id)}
                className="group relative flex min-w-0 flex-1 cursor-default flex-col items-center"
              >
                <div className="relative flex w-full flex-1 items-end justify-center pb-xs">
                  <div
                    style={{
                      height: `${Math.max(alto, p.valor > 0 ? 4 : 1.5)}%`,
                      ...(esResaltado
                        ? { backgroundColor: color }
                        : {
                            backgroundColor: `${color}2e`,
                            backgroundImage: `repeating-linear-gradient(135deg, ${color}38 0 2px, transparent 2px 7px)`,
                          }),
                    }}
                    className={cn(
                      'relative w-full max-w-[44px] rounded-full transition-[height,background-color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]',
                      esResaltado &&
                        'shadow-[0_10px_24px_-10px_rgba(22,163,74,0.8)]',
                    )}
                  >
                    {esResaltado && (
                      <span className="absolute -top-sm left-1/2 z-10 flex -translate-x-1/2 -translate-y-full animate-aparecer flex-col items-center">
                        <span className="rounded-full bg-gray-darkest px-sm py-xxs text-caption font-semibold whitespace-nowrap text-white tabular-nums shadow-lift">
                          {p.valor}
                          {activo && (
                            <span className="font-medium text-white/70">
                              {' '}
                              · {p.detalle ?? p.etiqueta}
                            </span>
                          )}
                        </span>
                        <span className="-mt-1 h-2 w-2 rotate-45 bg-gray-darkest" />
                      </span>
                    )}
                  </div>
                </div>
                <span
                  aria-hidden
                  className={cn(
                    'flex h-lg items-end text-caption whitespace-nowrap tabular-nums',
                    esResaltado
                      ? 'font-semibold text-gray-darkest'
                      : 'text-gray-default',
                    !conEtiqueta && 'invisible',
                  )}
                >
                  {p.etiqueta}
                </span>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

export default BarChart
