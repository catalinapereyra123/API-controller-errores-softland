import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { colors } from '../styles'
import { cn } from '../utils/cn'

export interface LineChartSerie {
  id: string
  label: string
  color: string
  values: number[]
  /** Dato al lado del nombre en la leyenda (p. ej. el total del período). */
  resumen?: ReactNode
}

interface LineChartProps {
  /** Una etiqueta por punto (eje X). */
  labels: string[]
  series: LineChartSerie[]
  height?: number
  /** Qué muestra el gráfico, para lectores de pantalla y la tabla oculta. */
  titulo: string
  /** Punto marcado (p. ej. el día por el que se filtra una lista). */
  seleccionado?: number | null
  /** Si viene, clic en un punto lo selecciona (y clic de nuevo lo suelta). */
  onSeleccionar?: (indice: number | null) => void
}

const MARGEN = { top: 12, right: 12, bottom: 28, left: 36 }
/** Cuántas rayas horizontales se buscan, como mucho. */
const DIVISIONES = 5

/** Paso "redondo" (1, 2, 5 × 10ⁿ) para que las marcas del eje Y sean limpias. */
function pasoRedondo(maximo: number): number {
  const crudo = Math.max(1, maximo / DIVISIONES)
  const potencia = 10 ** Math.floor(Math.log10(crudo))
  const paso = [1, 2, 5, 10].find((m) => m * potencia >= crudo) ?? 10
  return paso * potencia
}

/**
 * Gráfico de líneas liviano (SVG, sin librerías): una escala, área suave
 * debajo de cada línea, leyenda arriba y cruz + tooltip al pasar el mouse.
 */
function LineChart({
  labels,
  series,
  height = 240,
  titulo,
  seleccionado = null,
  onSeleccionar,
}: LineChartProps) {
  const contenedorRef = useRef<HTMLDivElement>(null)
  const [ancho, setAncho] = useState(0)
  const [activo, setActivo] = useState<number | null>(null)

  useLayoutEffect(() => {
    const el = contenedorRef.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) =>
      setAncho(entry.contentRect.width),
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const puntos = labels.length
  const maximo = Math.max(0, ...series.flatMap((s) => s.values))
  const paso = pasoRedondo(maximo)
  // El techo es la primera marca que cubre el máximo (sin aire de más arriba).
  const divisiones = Math.max(1, Math.ceil(maximo / paso))
  const techo = paso * divisiones

  const anchoUtil = Math.max(0, ancho - MARGEN.left - MARGEN.right)
  const altoUtil = height - MARGEN.top - MARGEN.bottom
  const separacion = puntos > 1 ? anchoUtil / (puntos - 1) : 0
  const x = (i: number) =>
    MARGEN.left + (puntos > 1 ? i * separacion : anchoUtil / 2)
  const y = (valor: number) =>
    MARGEN.top + altoUtil - (valor / techo) * altoUtil

  // Etiquetas del eje X: tantas como entren sin pisarse; la última siempre.
  const cadaCuantas = Math.max(
    1,
    Math.ceil(puntos / Math.max(1, Math.floor(anchoUtil / 56))),
  )
  const mostrarEtiqueta = (i: number) =>
    i === puntos - 1 || (i % cadaCuantas === 0 && puntos - 1 - i >= cadaCuantas)

  /** El punto más cercano al puntero (sólo cuenta la X). */
  function indiceEn(event: React.MouseEvent<SVGSVGElement>): number {
    const rect = event.currentTarget.getBoundingClientRect()
    const relativo = event.clientX - rect.left - MARGEN.left
    const indice = puntos > 1 ? Math.round(relativo / separacion) : 0
    return Math.min(puntos - 1, Math.max(0, indice))
  }

  const tooltipALaIzquierda = activo !== null && x(activo) > ancho / 2

  return (
    <div className="flex flex-col gap-md">
      <ul className="flex flex-wrap items-center gap-x-lg gap-y-xs">
        {series.map((serie) => (
          <li
            key={serie.id}
            className="flex items-center gap-sm text-bodySmall text-gray-medium"
          >
            <span
              aria-hidden
              style={{ backgroundColor: serie.color }}
              className="h-[3px] w-4 rounded-full"
            />
            <span className="font-semibold">{serie.label}</span>
            {serie.resumen !== undefined && (
              <span className="font-semibold text-gray-darkest tabular-nums">
                {serie.resumen}
              </span>
            )}
          </li>
        ))}
      </ul>

      <div ref={contenedorRef} className="relative" style={{ height }}>
        {ancho > 0 && (
          <svg
            width={ancho}
            height={height}
            role="img"
            aria-label={titulo}
            onPointerMove={(event) => puntos > 0 && setActivo(indiceEn(event))}
            onPointerLeave={() => setActivo(null)}
            // Del clic mismo (no del hover): en pantallas táctiles no hay hover.
            onClick={(event) => {
              if (!onSeleccionar || puntos === 0) return
              const indice = indiceEn(event)
              onSeleccionar(indice === seleccionado ? null : indice)
            }}
            className={cn(
              'block touch-none select-none',
              onSeleccionar && 'cursor-pointer',
            )}
          >
            {seleccionado !== null && puntos > 0 && (
              <rect
                x={x(seleccionado) - Math.max(6, separacion / 2)}
                y={MARGEN.top}
                width={Math.max(12, separacion)}
                height={altoUtil}
                rx={6}
                fill={colors.primary.lightest}
              />
            )}

            {Array.from({ length: divisiones + 1 }, (_, i) => {
              const valor = i * paso
              return (
                <g key={valor}>
                  <line
                    x1={MARGEN.left}
                    x2={ancho - MARGEN.right}
                    y1={y(valor)}
                    y2={y(valor)}
                    stroke={
                      i === 0 ? colors.background.border : colors.chart.grid
                    }
                    strokeWidth={1}
                  />
                  <text
                    x={MARGEN.left - 8}
                    y={y(valor)}
                    textAnchor="end"
                    dominantBaseline="middle"
                    fill={colors.gray.default}
                    className="text-caption tabular-nums"
                  >
                    {valor}
                  </text>
                </g>
              )
            })}

            {labels.map(
              (label, i) =>
                mostrarEtiqueta(i) && (
                  <text
                    key={`${label}-${i}`}
                    x={x(i)}
                    y={height - 8}
                    textAnchor={
                      puntos > 1 && i === puntos - 1
                        ? 'end'
                        : puntos > 1 && i === 0
                          ? 'start'
                          : 'middle'
                    }
                    fill={colors.gray.default}
                    className="text-caption tabular-nums"
                  >
                    {label}
                  </text>
                ),
            )}

            {series.map((serie) => {
              const linea = serie.values
                .map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(v)}`)
                .join(' ')
              const area = `${linea} L${x(puntos - 1)},${y(0)} L${x(0)},${y(0)} Z`
              return (
                <g key={serie.id}>
                  <path d={area} fill={serie.color} fillOpacity={0.08} />
                  <path
                    d={linea}
                    fill="none"
                    stroke={serie.color}
                    strokeWidth={2}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                </g>
              )
            })}

            {activo !== null && (
              <g pointerEvents="none">
                <line
                  x1={x(activo)}
                  x2={x(activo)}
                  y1={MARGEN.top}
                  y2={MARGEN.top + altoUtil}
                  stroke={colors.gray.light}
                  strokeWidth={1}
                />
                {series.map((serie) => (
                  <circle
                    key={serie.id}
                    cx={x(activo)}
                    cy={y(serie.values[activo] ?? 0)}
                    r={4.5}
                    fill={serie.color}
                    stroke={colors.background.surface}
                    strokeWidth={2}
                  />
                ))}
              </g>
            )}
          </svg>
        )}

        {activo !== null && (
          <div
            role="status"
            style={{
              left: x(activo),
              transform: tooltipALaIzquierda
                ? 'translateX(calc(-100% - 12px))'
                : 'translateX(12px)',
            }}
            className="pointer-events-none absolute top-0 z-10 flex min-w-[148px] animate-aparecer flex-col gap-xs rounded-lg bg-white px-md py-sm shadow-lift ring-1 ring-slate-900/5"
          >
            <span className="text-caption font-semibold text-gray-medium">
              {labels[activo]}
            </span>
            {series.map((serie) => (
              <span
                key={serie.id}
                className="flex items-center gap-sm text-bodySmall text-gray-dark"
              >
                <span
                  aria-hidden
                  style={{ backgroundColor: serie.color }}
                  className="h-2 w-2 rounded-full"
                />
                {serie.label}
                <span className="ml-auto pl-md font-semibold text-gray-darkest tabular-nums">
                  {serie.values[activo] ?? 0}
                </span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Los mismos datos como tabla, para lectores de pantalla. */}
      <table className="sr-only">
        <caption>{titulo}</caption>
        <thead>
          <tr>
            <th scope="col">Período</th>
            {series.map((serie) => (
              <th key={serie.id} scope="col">
                {serie.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {labels.map((label, i) => (
            <tr key={`${label}-${i}`}>
              <th scope="row">{label}</th>
              {series.map((serie) => (
                <td key={serie.id}>{serie.values[i] ?? 0}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default LineChart
