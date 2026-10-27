export const colors = {
  primary: {
    lightest: '#ecfdf5',
    light: '#bbf7d0',
    default: '#16a34a',
    dark: '#15803d',
    darkest: '#052e16',
    /** Logo y acentos de marca. */
    gradient: 'linear-gradient(135deg, #22c55e, #15803d)',
    /** Tarjeta destacada (el número principal de cada pantalla). */
    hero: 'linear-gradient(150deg, #1f9d52 0%, #12703a 55%, #0b4f29 100%)',
  },

  // Paleta iFlow para el panel de acceso: verde profundo + lima de la marca.
  brand: {
    lime: '#8dc63f',
    limeSoft: '#c5e79a',
    forest: '#1c4a1f',
    deep: '#0d2410',
  },

  background: {
    page: '#eef1ef',
    surface: '#ffffff',
    subtle: '#f3f5f4',
    border: '#e3e8e5',
  },

  gray: {
    white: '#ffffff',
    lightest: '#f8fafc',
    light: '#e2e8f0',
    default: '#94a3b8',
    medium: '#64748b',
    dark: '#334155',
    darkest: '#0f172a',
    black: '#000000',
    borderSoft: 'rgba(15, 23, 42, 0.12)',
  },

  // Estados Softland: success = S (resuelto), error = B/D/E, info = N (reproceso), warning = sin responsable
  status: {
    success: '#16a34a',
    warning: '#f59e0b',
    error: '#dc2626',
    info: '#0284c7',
  },

  // Etiquetas para empresa / proceso / categorías en la bandeja de errores
  label: {
    blue: { background: '#e7f0ff', text: '#1a4f8a', outline: '#5a96d4' },
    green: { background: '#e1f7e8', text: '#157347', outline: '#4caf6d' },
    orange: { background: '#fdecd9', text: '#b15a0a', outline: '#e8944a' },
    red: { background: '#fde2e2', text: '#b42318', outline: '#ef6c60' },
    purple: { background: '#efe4fb', text: '#6b21a8', outline: '#a374d6' },
    gray: { background: '#f1f5f9', text: '#475569', outline: '#94a3b8' },
  },

  // Series de los gráficos (Historial, Mi espacio). Par validado para
  // daltonismo: no reemplazar uno sin volver a chequear el otro.
  chart: {
    resueltos: '#16a34a',
    corregidos: '#2563eb',
    grid: '#eef2f6',
    /** Barras que no están resaltadas (rayadas, ver BarChart). */
    apagado: '#cfe9d8',
  },
} as const

export type Colors = typeof colors
