import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { colors, textStyles } from '../styles'
import { cn } from '../utils/cn'
import Card from './Card'
import { XIcon } from './icons'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: ReactNode
  children: ReactNode
  /** Ancho máximo del panel (cualquier unidad CSS). */
  maxWidth?: string
  className?: string
}

/**
 * Popup genérico centrado sobre un overlay. Cierra con Escape, click en el
 * fondo o el botón "X". El panel reutiliza `Card`. Se monta en `body` para
 * no quedar atrapado en contenedores con transform o z-index propio.
 */
function Modal({
  open,
  onClose,
  title,
  children,
  maxWidth = '420px',
  className,
}: ModalProps) {
  useEffect(() => {
    if (!open) return

    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleKey)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = previousOverflow
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-50 flex animate-fundido items-center justify-center p-lg backdrop-blur-sm"
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.45)' }}
    >
      <Card
        onClick={(event) => event.stopPropagation()}
        style={{ maxWidth }}
        className={cn(
          'max-h-[85vh] w-full animate-entrar overflow-y-auto shadow-lift',
          className,
        )}
      >
        <div className="mb-lg flex items-start justify-between gap-md">
          {title != null ? (
            <span style={{ ...textStyles.h3, color: colors.gray.darkest }}>
              {title}
            </span>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            style={{ color: colors.gray.medium }}
            className="-mt-xxs -mr-xxs flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-background-subtle"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>

        {children}
      </Card>
    </div>,
    document.body,
  )
}

export default Modal
