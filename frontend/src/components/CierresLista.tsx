import { useMemo, type ReactNode } from 'react'
import { estadoTagByEstado } from '../constants/estados'
import { colors } from '../styles'
import type { ErrorCierre } from '../types'
import {
  claveDia,
  etiquetaDia,
  formatDate,
  formatDuracion,
  formatTime,
  iniciales,
} from '../utils/format'
import ChevronButton from './ChevronButton'
import {
  AlertTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  RefreshIcon,
} from './icons'

/** Cómo terminó: lo que dice el ícono de la izquierda de cada fila. */
function resultadoDe(cierre: ErrorCierre): {
  icon: ReactNode
  color: string
  background: string
  texto: string
} {
  if (cierre.tipoCierre === 'resuelto') {
    return {
      icon: <CheckCircleIcon className="h-4 w-4" />,
      color: colors.label.green.text,
      background: colors.label.green.background,
      texto: 'Resuelto',
    }
  }
  if (cierre.estado === 'REQUIERE_CORRECCION') {
    return {
      icon: <AlertTriangleIcon className="h-4 w-4" />,
      color: colors.label.red.text,
      background: colors.label.red.background,
      texto: 'El reproceso volvió con error',
    }
  }
  return {
    icon: <RefreshIcon className="h-4 w-4" />,
    color: colors.label.blue.text,
    background: colors.label.blue.background,
    texto: 'Mandado a reprocesar',
  }
}

// Clases enteras (no armadas) para que Tailwind las encuentre. La tabla
// aparece cuando el contenedor tiene lugar para las columnas; antes, cada
// fila es una tarjeta compacta.
const COLUMNAS = {
  conQuien:
    'hidden grid-cols-[36px_minmax(200px,1.5fr)_150px_minmax(170px,1fr)_92px_minmax(110px,0.7fr)_40px] items-center gap-md px-lg @5xl:grid',
  sinQuien:
    'hidden grid-cols-[36px_minmax(180px,1.5fr)_150px_80px_minmax(90px,0.7fr)_40px] items-center gap-md px-lg @3xl:grid',
}

const COMPACTO = {
  conQuien: '@5xl:hidden',
  sinQuien: '@3xl:hidden',
}

function Encabezado({
  conQuien,
  conFecha,
}: {
  conQuien: boolean
  conFecha: boolean
}) {
  return (
    <div
      aria-hidden
      className={`${conQuien ? COLUMNAS.conQuien : COLUMNAS.sinQuien} py-sm text-overline font-semibold tracking-widest text-gray-default uppercase`}
    >
      <span />
      <span>Error</span>
      <span>Estado</span>
      {conQuien && <span>Quién</span>}
      <span>{conFecha ? 'Cuándo' : 'Hora'}</span>
      <span>Resolución</span>
      <span />
    </div>
  )
}

function CierreFila({
  cierre,
  conFecha,
  conQuien,
  onOpen,
}: {
  cierre: ErrorCierre
  conQuien: boolean
  /** Sin agrupar por día, la columna de hora muestra también la fecha. */
  conFecha: boolean
  onOpen: () => void
}) {
  const resultado = resultadoDe(cierre)
  const EstadoTag = estadoTagByEstado[cierre.estado]
  const icono = (
    <span
      title={resultado.texto}
      style={{
        color: resultado.color,
        backgroundColor: resultado.background,
      }}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
    >
      {resultado.icon}
    </span>
  )
  const abrir = (
    <ChevronButton
      color={colors.primary.dark}
      borderColor={colors.background.border}
      aria-label={`Abrir ${cierre.codigo}`}
      onClick={(event) => {
        event.stopPropagation()
        onOpen()
      }}
      className="justify-self-end"
    />
  )

  return (
    <div
      onClick={onOpen}
      style={{ borderColor: colors.background.border }}
      className="group cursor-pointer border-t py-md transition-colors hover:bg-background-page"
    >
      <div
        className={`flex items-center gap-md px-lg ${conQuien ? COMPACTO.conQuien : COMPACTO.sinQuien}`}
      >
        {icono}
        <div className="flex min-w-0 flex-1 flex-col gap-xxs">
          <span className="flex flex-wrap items-center gap-sm">
            <span className="font-mono text-body font-semibold text-gray-darkest">
              {cierre.codigo}
            </span>
            <EstadoTag />
          </span>
          <span className="truncate text-bodySmall text-gray-medium">
            {cierre.empresaNombre} · {cierre.modulo}
          </span>
          <span className="truncate text-caption text-gray-medium tabular-nums">
            {conQuien && `${cierre.cerradoPor ?? 'Verificación automática'} · `}
            {conFecha && `${formatDate(cierre.fechaCierre).slice(0, 5)} `}
            {formatTime(cierre.fechaCierre)}
            {cierre.minutosResolucion !== null &&
              ` · resuelto en ${formatDuracion(cierre.minutosResolucion)}`}
          </span>
        </div>
        {abrir}
      </div>

      <div className={conQuien ? COLUMNAS.conQuien : COLUMNAS.sinQuien}>
        {icono}

        <div className="flex min-w-0 flex-col">
          <span className="truncate font-mono text-body font-semibold text-gray-darkest">
            {cierre.codigo}
          </span>
          <span className="truncate text-bodySmall text-gray-medium">
            {cierre.empresaNombre} · {cierre.modulo}
          </span>
        </div>

        <EstadoTag />

        {!conQuien ? null : cierre.cerradoPor ? (
          <span className="flex min-w-0 items-center gap-sm">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-lightest text-caption font-semibold text-primary-dark">
              {iniciales(cierre.cerradoPor)}
            </span>
            <span className="truncate text-bodySmall font-semibold text-gray-dark">
              {cierre.cerradoPor}
            </span>
          </span>
        ) : (
          <span className="flex min-w-0 items-center gap-sm">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-background-subtle text-gray-medium">
              <RefreshIcon className="h-3.5 w-3.5" />
            </span>
            <span className="truncate text-bodySmall text-gray-medium">
              Verificación automática
            </span>
          </span>
        )}

        <span className="text-bodySmall text-gray-medium tabular-nums">
          {conFecha && (
            <span className="block font-semibold text-gray-dark">
              {formatDate(cierre.fechaCierre).slice(0, 5)}
            </span>
          )}
          {formatTime(cierre.fechaCierre)}
        </span>

        <span className="inline-flex items-center gap-xs text-bodySmall text-gray-medium tabular-nums">
          {cierre.minutosResolucion !== null ? (
            <>
              <ClockIcon className="h-3.5 w-3.5 text-gray-default" />
              {formatDuracion(cierre.minutosResolucion)}
            </>
          ) : (
            '—'
          )}
        </span>

        {abrir}
      </div>
    </div>
  )
}

interface CierresListaProps {
  cierres: ErrorCierre[]
  onOpen: (id: string) => void
  /** Separa la lista en tarjetas por día (con encabezado fijo). */
  agruparPorDia?: boolean
  /** Sin la columna "Quién" (p. ej. en Mi espacio, donde siempre es uno). */
  mostrarQuien?: boolean
}

/** Errores resueltos o corregidos: una fila por error, clic abre el detalle. */
function CierresLista({
  cierres,
  onOpen,
  agruparPorDia = false,
  mostrarQuien = true,
}: CierresListaProps) {
  const dias = useMemo(() => {
    const grupos = new Map<string, ErrorCierre[]>()
    for (const cierre of cierres) {
      const clave = claveDia(cierre.fechaCierre)
      grupos.set(clave, [...(grupos.get(clave) ?? []), cierre])
    }
    return [...grupos.entries()]
  }, [cierres])

  if (!agruparPorDia) {
    return (
      <div className="@container">
        <Encabezado conQuien={mostrarQuien} conFecha />
        {cierres.map((cierre) => (
          <CierreFila
            key={cierre.id}
            cierre={cierre}
            conFecha
            conQuien={mostrarQuien}
            onOpen={() => onOpen(cierre.id)}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-lg">
      {dias.map(([clave, delDia]) => {
        const etiqueta = etiquetaDia(delDia[0].fechaCierre)
        const fecha = formatDate(delDia[0].fechaCierre)
        const resueltos = delDia.filter((c) => c.tipoCierre === 'resuelto')

        return (
          <section
            key={clave}
            className="rounded-xxl bg-background-surface shadow-soft ring-1 ring-slate-900/[0.04]"
          >
            <header className="sticky top-16 z-10 flex flex-wrap items-baseline gap-sm rounded-t-xxl bg-white/90 px-lg pt-lg pb-sm backdrop-blur-md">
              <h3 className="text-h3 text-gray-darkest">{etiqueta}</h3>
              {etiqueta !== fecha && (
                <span className="text-bodySmall text-gray-medium">{fecha}</span>
              )}
              <span className="ml-auto flex gap-xs self-center">
                {resueltos.length > 0 && (
                  <span className="rounded-full bg-label-green-background px-sm py-px text-caption font-semibold text-label-green-text tabular-nums">
                    {resueltos.length}{' '}
                    {resueltos.length === 1 ? 'resuelto' : 'resueltos'}
                  </span>
                )}
                {delDia.length > resueltos.length && (
                  <span className="rounded-full bg-label-blue-background px-sm py-px text-caption font-semibold text-label-blue-text tabular-nums">
                    {delDia.length - resueltos.length} reprocesados
                  </span>
                )}
              </span>
            </header>
            <div className="@container pb-xs">
              <Encabezado conQuien={mostrarQuien} conFecha={false} />
              {delDia.map((cierre) => (
                <CierreFila
                  key={cierre.id}
                  cierre={cierre}
                  conFecha={false}
                  conQuien={mostrarQuien}
                  onOpen={() => onOpen(cierre.id)}
                />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}

export default CierresLista
