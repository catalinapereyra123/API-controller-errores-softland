import { ESTADOS_SOFTLAND } from '../constants/estadosSoftland'
import { colors, fontWeight, textStyles } from '../styles'
import Modal from './Modal'

interface EstadosSoftlandModalProps {
  open: boolean
  onClose: () => void
}

/** Popup con la leyenda de los posibles estados de Softland. */
function EstadosSoftlandModal({ open, onClose }: EstadosSoftlandModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Posibles estados"
      maxWidth="760px"
    >
      <ul className="flex flex-wrap justify-center gap-md">
        {ESTADOS_SOFTLAND.map((estado) => (
          <li
            key={estado.code}
            className="flex w-[124px] flex-col items-center gap-xs text-center"
          >
            <span
              style={{
                color: estado.color,
                backgroundColor: estado.background,
              }}
              className="flex h-12 w-12 items-center justify-center rounded-full text-bodyLarge font-bold"
            >
              {estado.code}
            </span>
            <span
              style={{
                ...textStyles.bodySmall,
                fontWeight: fontWeight.bold,
                color: colors.gray.darkest,
              }}
            >
              {estado.label}
            </span>
            <span
              style={{ ...textStyles.caption, color: colors.gray.medium }}
            >
              {estado.description}
            </span>
          </li>
        ))}
      </ul>
    </Modal>
  )
}

export default EstadosSoftlandModal
