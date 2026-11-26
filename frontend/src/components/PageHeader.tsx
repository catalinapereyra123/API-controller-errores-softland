import type { ReactNode } from 'react'

interface PageHeaderProps {
  titulo: ReactNode
  /** Una línea en gris debajo del título: para qué sirve la pantalla. */
  descripcion?: ReactNode
  /** Controles a la derecha (período, pestañas, actualizar…). */
  acciones?: ReactNode
}

/**
 * Encabezado de cada pantalla: el título grande en peso liviano y, debajo,
 * qué se hace ahí. Mismo formato en todas para que se lean igual.
 */
function PageHeader({ titulo, descripcion, acciones }: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-md">
      <div className="flex min-w-0 flex-col gap-xs">
        <h1 className="text-titulo font-medium tracking-[-0.03em] text-gray-darkest">
          {titulo}
        </h1>
        {descripcion && (
          <p className="text-body text-gray-medium">{descripcion}</p>
        )}
      </div>
      {acciones && (
        <div className="flex flex-wrap items-center gap-sm">{acciones}</div>
      )}
    </div>
  )
}

export default PageHeader
