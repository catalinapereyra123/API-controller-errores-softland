import {
  ESTADOS_SOFTLAND,
  type EstadoSoftland,
} from '../constants/estadosSoftland'
import { cn } from '../utils/cn'
import Modal from './Modal'

interface EstadosSoftlandModalProps {
  open: boolean
  onClose: () => void
  /** Status del error que se está mirando: se resalta. */
  actual?: string
}

const GRUPOS: {
  id: EstadoSoftland['grupo']
  titulo: string
  detalle: string
}[] = [
  {
    id: 'corregir',
    titulo: 'Hay que corregirlas',
    detalle:
      'Softland no pudo procesarlas: se arreglan y se mandan a reprocesar.',
  },
  {
    id: 'sin-error',
    titulo: 'No son errores',
    detalle:
      'Están por procesarse, ya se procesaron o quedaron fuera del proceso.',
  },
]

// Dentro de cada fila, en el orden en que conviene leerlas.
const ORDEN = ['E', 'D', 'B', 'N', 'S', 'X']

/** Popup con la leyenda de los status de Softland, en dos filas de tres. */
function EstadosSoftlandModal({
  open,
  onClose,
  actual,
}: EstadosSoftlandModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Posibles estados"
      maxWidth="880px"
    >
      <div className="flex flex-col gap-lg">
        {GRUPOS.map((grupo) => (
          <section key={grupo.id} className="flex flex-col gap-sm">
            <div className="flex flex-wrap items-baseline gap-x-sm gap-y-xxs">
              <h3 className="text-body font-semibold text-gray-darkest">
                {grupo.titulo}
              </h3>
              <span className="text-caption text-gray-medium">
                {grupo.detalle}
              </span>
            </div>
            <ul className="grid grid-cols-1 gap-sm sm:grid-cols-3">
              {ESTADOS_SOFTLAND.filter((e) => e.grupo === grupo.id)
                .sort((a, b) => ORDEN.indexOf(a.code) - ORDEN.indexOf(b.code))
                .map((estado) => (
                  <Tarjeta
                    key={estado.code}
                    estado={estado}
                    esActual={estado.code === actual}
                  />
                ))}
            </ul>
          </section>
        ))}
      </div>
    </Modal>
  )
}

function Tarjeta({
  estado,
  esActual,
}: {
  estado: EstadoSoftland
  esActual: boolean
}) {
  return (
    // Alto fijo en las seis: entra el título y dos líneas de descripción.
    <li
      style={esActual ? { boxShadow: `0 0 0 2px ${estado.color}` } : undefined}
      className={cn(
        'relative flex h-[6.25rem] items-center gap-md rounded-2xl bg-background-subtle px-md',
        !esActual && 'ring-1 ring-background-border',
      )}
    >
      {/* Halo del color del estado en la esquina (recortado a la tarjeta). */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl"
      >
        <span
          style={{ backgroundColor: estado.background }}
          className="absolute -top-8 -right-8 h-20 w-20 rounded-full opacity-80 blur-xl"
        />
      </span>
      {/* "Este error" va sobre el borde: no le suma alto a la tarjeta. */}
      {esActual && (
        <span
          style={{ color: estado.color, backgroundColor: estado.background }}
          className="absolute -top-2.5 right-md rounded-full px-sm py-px text-[0.6875rem] font-semibold tracking-wide uppercase ring-2 ring-background-surface"
        >
          Este error
        </span>
      )}
      <span
        style={{ color: estado.color, backgroundColor: estado.background }}
        className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-bodyLarge font-semibold ring-4 ring-background-surface"
      >
        {estado.code}
      </span>
      <span className="relative flex min-w-0 flex-col gap-xxs">
        <span className="text-bodySmall font-semibold text-gray-darkest">
          {estado.label}
        </span>
        <span className="line-clamp-2 text-caption text-gray-medium">
          {estado.description}
        </span>
      </span>
    </li>
  )
}

export default EstadosSoftlandModal
