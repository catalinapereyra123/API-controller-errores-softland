/**
 * El ojo de IRIS (el iris es la parte del ojo que mira). Va blanco sobre el
 * cuadrado verde de la marca; el favicon es el mismo dibujo con su fondo.
 */
function IrisLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="8 12 32 24" aria-hidden className={className}>
      <path
        d="M8 24c4.5-7 10-10.5 16-10.5S35.5 17 40 24c-4.5 7-10 10.5-16 10.5S12.5 31 8 24z"
        fill="#fff"
      />
      <circle cx="24" cy="24" r="7" fill="#15803d" />
      <circle cx="24" cy="24" r="3" fill="#0b3d1c" />
      <circle cx="26.5" cy="21.5" r="1.6" fill="#fff" />
    </svg>
  )
}

export default IrisLogo
