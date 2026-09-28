import { colors } from '../styles'

/** Pin de ubicación con la punta en (x, y + 26). */
function Pin({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <path
        d={`M${x} ${y + 26} C${x - 4} ${y + 18} ${x - 16} ${y + 8} ${x - 16} ${y - 2} A16 16 0 1 1 ${x + 16} ${y - 2} C${x + 16} ${y + 8} ${x + 4} ${y + 18} ${x} ${y + 26} Z`}
        fill={colors.brand.lime}
        stroke={colors.brand.deep}
        strokeWidth={1.5}
      />
      <circle cx={x} cy={y - 2} r={6} fill={colors.brand.deep} />
    </g>
  )
}

/**
 * Ilustración del panel de acceso: un globo con rutas y pines sobre una caja,
 * en línea con la gráfica de iFlow. Todo vectorial, sin fotos.
 */
function AuthIlustracion({ className }: { className?: string }) {
  const trazo = 'rgba(255,255,255,0.35)'

  return (
    <svg viewBox="0 0 420 420" fill="none" aria-hidden className={className}>
      {/* Sombra y caja */}
      <ellipse cx={210} cy={410} rx={110} ry={8} fill="rgba(0,0,0,0.3)" />
      <polygon
        points="130,305 210,340 210,405 130,370"
        fill="rgba(255,255,255,0.05)"
        stroke={trazo}
      />
      <polygon
        points="210,340 290,305 290,370 210,405"
        fill="rgba(255,255,255,0.1)"
        stroke={trazo}
      />
      <polygon
        points="210,270 290,305 210,340 130,305"
        fill="rgba(255,255,255,0.14)"
        stroke={trazo}
      />
      <polygon
        points="174,285.75 254,320.75 246,324.25 166,289.25"
        fill={colors.brand.lime}
      />
      <polygon
        points="254,320.75 246,324.25 246,346 254,342.5"
        fill={colors.brand.lime}
        opacity={0.75}
      />

      {/* Órbitas */}
      <ellipse
        cx={210}
        cy={160}
        rx={180}
        ry={52}
        transform="rotate(-10 210 160)"
        stroke={colors.brand.limeSoft}
        strokeOpacity={0.7}
        strokeWidth={1.5}
        strokeDasharray="5 8"
      />

      {/* Globo */}
      <circle
        cx={210}
        cy={160}
        r={105}
        fill="rgba(255,255,255,0.07)"
        stroke="rgba(255,255,255,0.6)"
        strokeWidth={1.5}
      />
      <ellipse cx={210} cy={160} rx={48} ry={105} stroke={trazo} />
      <ellipse cx={210} cy={160} rx={86} ry={105} stroke={trazo} />
      <ellipse cx={210} cy={160} rx={105} ry={30} stroke={trazo} />
      <path d="M118 110 H302 M118 210 H302" stroke={trazo} />
      <circle
        cx={210}
        cy={160}
        r={140}
        stroke="rgba(255,255,255,0.18)"
        strokeDasharray="3 9"
      />

      {/* Ruta entre pines */}
      <path
        d="M160 118 Q 225 60 290 148 Q 270 205 225 228"
        stroke={colors.brand.lime}
        strokeWidth={2}
        strokeDasharray="6 6"
      />
      <Pin x={160} y={92} />
      <Pin x={290} y={122} />
      <Pin x={225} y={202} />
    </svg>
  )
}

export default AuthIlustracion
