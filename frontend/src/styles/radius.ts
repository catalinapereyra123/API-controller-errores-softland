export const radius = {
  xs: '0.25rem',
  sm: '0.375rem',
  md: '0.5rem',
  lg: '0.75rem',
  xl: '1rem',
  /** Tarjetas y paneles. */
  xxl: '1.5rem',
  /** Marco de la app (sidebar flotante). */
  xxxl: '2rem',
  full: '9999px',
} as const

export type Radius = typeof radius
