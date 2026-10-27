import type { ReactNode } from 'react'
import { cn } from '../utils/cn'
import Card from './Card'
import IrBoton from './IrBoton'

interface PanelProps {
  titulo: ReactNode
  subtitulo?: ReactNode
  /** Si viene, aparece la flechita ↗ que lleva al detalle. */
  onIr?: () => void
  irLabel?: string
  /** Controles a la derecha del título (pestañas, filtros…). */
  acciones?: ReactNode
  /** `none` deja el contenido a ras (tablas, listas con filas propias). */
  padding?: 'lg' | 'none'
  className?: string
  children: ReactNode
}

/** Tarjeta con encabezado: título, subtítulo, acciones y la flechita "ir a". */
function Panel({
  titulo,
  subtitulo,
  onIr,
  irLabel = 'Ver detalle',
  acciones,
  padding = 'lg',
  className,
  children,
}: PanelProps) {
  return (
    <Card
      padding="none"
      className={cn(
        'flex min-w-0 flex-col',
        padding === 'lg' && 'pb-lg',
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-md px-lg pt-lg pb-md">
        <div className="flex min-w-0 flex-1 basis-[200px] flex-col gap-xxs">
          <h2 className="text-h4 font-medium text-gray-darkest">{titulo}</h2>
          {subtitulo && (
            <p className="text-bodySmall text-gray-medium">{subtitulo}</p>
          )}
        </div>
        {(acciones || onIr) && (
          <div className="flex shrink-0 items-center gap-sm">
            {acciones}
            {onIr && <IrBoton label={irLabel} onClick={onIr} />}
          </div>
        )}
      </div>
      <div
        className={cn('@container min-w-0 flex-1', padding === 'lg' && 'px-lg')}
      >
        {children}
      </div>
    </Card>
  )
}

export default Panel
