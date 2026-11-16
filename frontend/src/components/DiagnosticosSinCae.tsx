import { DIAGNOSTICO_SIN_CAE } from '../constants/sinCae'
import type { DiagnosticoSinCae } from '../types'
import { cn } from '../utils/cn'

/** Las etiquetas de diagnóstico de un comprobante sin CAE, una al lado de otra. */
function DiagnosticosSinCae({
  diagnosticos,
  className,
}: {
  diagnosticos: DiagnosticoSinCae[]
  className?: string
}) {
  return (
    <span className={cn('flex flex-wrap items-center gap-xs', className)}>
      {diagnosticos.map((diagnostico) => {
        const meta = DIAGNOSTICO_SIN_CAE[diagnostico]
        return (
          <span
            key={diagnostico}
            style={{ color: meta.color, backgroundColor: meta.background }}
            className="rounded-full px-sm py-xxs text-caption font-semibold whitespace-nowrap"
          >
            {meta.label}
          </span>
        )
      })}
    </span>
  )
}

export default DiagnosticosSinCae
