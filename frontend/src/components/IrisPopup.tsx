import type { ReactNode } from 'react'
import iflowGlobo from '../assets/iflow-globo.png'
import { cn } from '../utils/cn'
import { XIcon } from './icons'
import Modal from './Modal'

type Tono = 'exito' | 'aviso' | 'peligro'

const TONOS: Record<Tono, { halo: string; pulso: string; circulo: string }> = {
  exito: {
    halo: 'bg-brand-lime/25',
    pulso: 'bg-brand-lime/30',
    circulo:
      'bg-brand-lime text-brand-deep shadow-[0_12px_30px_-10px_rgba(141,198,63,0.8)]',
  },
  // Sin color propio: el ícono en blanco sobre el verde de la marca.
  aviso: {
    halo: 'bg-brand-lime/15',
    pulso: 'bg-white/15',
    circulo: 'bg-white/15 text-white ring-1 ring-white/30 backdrop-blur-sm',
  },
  peligro: {
    halo: 'bg-[#ef4444]/25',
    pulso: 'bg-[#ef4444]/30',
    circulo:
      'bg-[#f87171] text-[#7f1d1d] shadow-[0_12px_30px_-10px_rgba(239,68,68,0.8)]',
  },
}

interface IrisPopupProps {
  onClose: () => void
  /** Lo que va en el círculo grande del encabezado. */
  icono: ReactNode
  /** `exito`: círculo lima. `aviso`: blanco translúcido. `peligro`: rojo (confirmar un borrado). */
  tono?: Tono
  /** El cuerpo blanco (etiqueta, título, texto y botones). */
  children: ReactNode
}

/**
 * Popup con la marca de IRIS: encabezado verde oscuro con el logo y un
 * círculo grande que dice qué pasó, y debajo el contenido.
 */
function IrisPopup({
  onClose,
  icono,
  tono = 'exito',
  children,
}: IrisPopupProps) {
  const colores = TONOS[tono]

  return (
    <Modal open onClose={onClose} desnudo maxWidth="420px">
      <div className="relative overflow-hidden bg-[linear-gradient(160deg,#14532d,#0b2e18)] px-lg pt-lg pb-xl text-white">
        <span
          aria-hidden
          className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full border-[30px] border-white/[0.05]"
        />
        <span
          aria-hidden
          className={cn(
            'pointer-events-none absolute -bottom-16 -left-10 h-40 w-40 rounded-full blur-3xl',
            colores.halo,
          )}
        />

        <div className="relative flex items-center justify-between gap-md">
          <span className="flex items-center gap-sm">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 p-xs ring-1 ring-white/20">
              <img
                src={iflowGlobo}
                alt=""
                className="h-full w-full object-contain"
              />
            </span>
            <span className="flex flex-col">
              <span className="text-[1.25rem] leading-tight font-medium tracking-tight">
                IRIS
              </span>
              <span className="text-caption text-white/60">
                Incidencias de Softland
              </span>
            </span>
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-white/20 transition-colors hover:bg-white hover:text-primary-dark"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="relative mt-xl flex justify-center">
          <span
            aria-hidden
            style={{ animationIterationCount: 2 }}
            className={cn(
              'absolute h-20 w-20 animate-ping rounded-full',
              colores.pulso,
            )}
          />
          <span
            className={cn(
              'relative flex h-20 w-20 items-center justify-center rounded-full ring-8 ring-white/10',
              colores.circulo,
            )}
          >
            {icono}
          </span>
        </div>
      </div>

      {/* Mismo alto en todos los popups: si sobra lugar se reparte arriba del
          contenido y arriba de los botones (lo último), que quedan al pie. */}
      <div className="flex min-h-[20.5rem] flex-col items-center gap-md px-lg pt-lg pb-lg text-center [&>*:first-child]:mt-auto [&>*:last-child]:mt-auto">
        {children}
      </div>
    </Modal>
  )
}

export default IrisPopup
