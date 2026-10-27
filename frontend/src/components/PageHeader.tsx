import type { ReactNode } from 'react'

interface PageHeaderProps {
  /** Línea chica en verde arriba del título: saludo o contexto. */
  eyebrow?: ReactNode
  titulo: ReactNode
  /** Controles a la derecha (período, pestañas, actualizar…). */
  acciones?: ReactNode
}

/**
 * Encabezado de cada pantalla: una línea de contexto en verde y el título
 * grande en peso liviano. Mismo formato en todas para que se lean igual.
 */
function PageHeader({ eyebrow, titulo, acciones }: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-md">
      <div className="flex min-w-0 flex-col gap-xs">
        {eyebrow && (
          <p className="text-bodySmall font-semibold text-primary-dark">
            {eyebrow}
          </p>
        )}
        <h1 className="text-titulo font-medium tracking-[-0.03em] text-gray-darkest">
          {titulo}
        </h1>
      </div>
      {acciones && (
        <div className="flex flex-wrap items-center gap-sm">{acciones}</div>
      )}
    </div>
  )
}

export default PageHeader
