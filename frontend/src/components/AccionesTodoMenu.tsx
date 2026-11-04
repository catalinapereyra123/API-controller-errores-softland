import { useEffect, useRef, useState, type ReactNode } from 'react'
import { colors, spacing } from '../styles'
import { cn } from '../utils/cn'
import Button from './Button'
import { MoreIcon, PauseIcon, TrashIcon } from './icons'
import Modal from './Modal'

type Accion = 'pausar' | 'eliminar'

interface AccionesTodoMenuProps {
  /** Cuántas North Star y KR hay (en total y activos). */
  northStars: number
  krs: number
  activos: number
  onPausarTodo: () => Promise<void>
  onEliminarTodo: () => Promise<void>
}

const plural = (n: number, uno: string, varios: string) =>
  `${n} ${n === 1 ? uno : varios}`

/**
 * Botón "⋯" del encabezado de Objetivos con las acciones sobre todo el
 * conjunto: pausar (reversible) o eliminar (no). Las dos piden confirmación.
 */
function AccionesTodoMenu({
  northStars,
  krs,
  activos,
  onPausarTodo,
  onEliminarTodo,
}: AccionesTodoMenuProps) {
  const [abierto, setAbierto] = useState(false)
  const [confirmar, setConfirmar] = useState<Accion | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const contenedorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!abierto) return

    function alClickAfuera(event: MouseEvent) {
      if (!contenedorRef.current?.contains(event.target as Node)) {
        setAbierto(false)
      }
    }

    function alEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setAbierto(false)
    }

    document.addEventListener('mousedown', alClickAfuera)
    document.addEventListener('keydown', alEscape)
    return () => {
      document.removeEventListener('mousedown', alClickAfuera)
      document.removeEventListener('keydown', alEscape)
    }
  }, [abierto])

  function pedir(accion: Accion) {
    setAbierto(false)
    setError(null)
    setConfirmar(accion)
  }

  async function ejecutar() {
    if (!confirmar) return
    setEnviando(true)
    setError(null)
    try {
      await (confirmar === 'pausar' ? onPausarTodo() : onEliminarTodo())
      setConfirmar(null)
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : confirmar === 'pausar'
            ? 'No pudimos pausar todo.'
            : 'No pudimos eliminar todo.',
      )
    } finally {
      setEnviando(false)
    }
  }

  const queHay = [
    northStars ? plural(northStars, 'North Star', 'North Star') : null,
    krs ? plural(krs, 'KR', 'KR') : null,
  ]
    .filter(Boolean)
    .join(' y ')
  const esEliminar = confirmar === 'eliminar'

  return (
    <div ref={contenedorRef} className="relative">
      <button
        type="button"
        onClick={() => setAbierto((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-label="Más acciones"
        title="Más acciones"
        className={cn(
          'flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-background-surface text-gray-dark shadow-xs ring-1 ring-background-border transition-shadow hover:shadow-soft',
          'focus-visible:ring-4 focus-visible:ring-primary-light/60 focus-visible:outline-none',
          abierto && 'ring-4 ring-primary-light/60',
        )}
      >
        <MoreIcon className="h-5 w-5" />
      </button>

      {abierto && (
        <ul
          role="menu"
          className="absolute right-0 z-30 mt-xs w-[min(300px,calc(100vw-2rem))] animate-aparecer rounded-2xl border border-background-border bg-background-surface p-xs shadow-lift"
        >
          <Opcion
            icono={<PauseIcon className="h-4 w-4" />}
            titulo="Pausar todo"
            detalle={
              activos
                ? 'Quedan guardadas para activarlas cuando quieras.'
                : 'Ya está todo pausado.'
            }
            disabled={activos === 0}
            onClick={() => pedir('pausar')}
          />
          <Opcion
            icono={<TrashIcon className="h-4 w-4" />}
            titulo="Eliminar todo"
            detalle="Borra la North Star y los KR. No se puede deshacer."
            peligro
            onClick={() => pedir('eliminar')}
          />
        </ul>
      )}

      {confirmar && (
        <Modal
          open
          onClose={() => !enviando && setConfirmar(null)}
          title={esEliminar ? '¿Eliminar todo?' : '¿Pausar todo?'}
          maxWidth="440px"
        >
          <div className="flex flex-col gap-lg">
            <div className="flex items-start gap-md">
              <span
                className={cn(
                  'flex h-11 w-11 shrink-0 items-center justify-center rounded-full',
                  esEliminar
                    ? 'bg-label-red-background text-label-red-text'
                    : 'bg-label-orange-background text-label-orange-text',
                )}
              >
                {esEliminar ? (
                  <TrashIcon className="h-5 w-5" />
                ) : (
                  <PauseIcon className="h-5 w-5" />
                )}
              </span>
              <p className="text-body text-gray-dark">
                {esEliminar ? (
                  <>
                    Se van a borrar{' '}
                    <b className="text-gray-darkest">{queHay}</b>, con sus
                    metas.{' '}
                    <b className="text-gray-darkest">No se puede deshacer</b>;
                    si sólo querés frenarlas un tiempo, usá "Pausar todo".
                  </>
                ) : (
                  <>
                    Se pausan{' '}
                    <b className="text-gray-darkest">
                      {plural(activos, 'métrica activa', 'métricas activas')}
                    </b>
                    . Quedan guardadas en "Pausadas" con sus metas y las podés
                    volver a activar una por una.
                  </>
                )}
              </p>
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-xl bg-label-red-background px-md py-sm text-bodySmall font-semibold text-label-red-text"
              >
                {error}
              </p>
            )}

            <div className="flex justify-end gap-sm">
              <Button
                text="Cancelar"
                variant="outline"
                color={colors.gray.medium}
                onClick={() => setConfirmar(null)}
                disabled={enviando}
                size={{ padding: `${spacing.sm} ${spacing.lg}` }}
              />
              <Button
                text={
                  enviando
                    ? esEliminar
                      ? 'Eliminando…'
                      : 'Pausando…'
                    : esEliminar
                      ? 'Sí, eliminar todo'
                      : 'Pausar todo'
                }
                color={
                  esEliminar ? colors.status.error : colors.primary.default
                }
                icon={
                  esEliminar ? (
                    <TrashIcon className="h-4 w-4" />
                  ) : (
                    <PauseIcon className="h-4 w-4" />
                  )
                }
                onClick={() => void ejecutar()}
                disabled={enviando}
                size={{ padding: `${spacing.sm} ${spacing.lg}` }}
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

function Opcion({
  icono,
  titulo,
  detalle,
  peligro = false,
  disabled = false,
  onClick,
}: {
  icono: ReactNode
  titulo: string
  detalle: string
  peligro?: boolean
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <li role="none">
      <button
        type="button"
        role="menuitem"
        onClick={onClick}
        disabled={disabled}
        className={cn(
          'flex w-full cursor-pointer items-start gap-sm rounded-xl px-sm py-sm text-left transition-colors',
          peligro
            ? 'hover:bg-label-red-background'
            : 'hover:bg-background-page',
          'disabled:cursor-default disabled:opacity-50 disabled:hover:bg-transparent',
        )}
      >
        <span
          className={cn(
            'mt-px flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
            peligro
              ? 'bg-label-red-background text-label-red-text'
              : 'bg-background-subtle text-gray-dark',
          )}
        >
          {icono}
        </span>
        <span className="flex flex-col gap-xxs">
          <span
            className={cn(
              'text-body font-semibold',
              peligro ? 'text-label-red-text' : 'text-gray-darkest',
            )}
          >
            {titulo}
          </span>
          <span className="text-caption text-gray-medium">{detalle}</span>
        </span>
      </button>
    </li>
  )
}

export default AccionesTodoMenu
