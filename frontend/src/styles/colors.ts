export const colors = {
  primary: {
    lightest: '#f5f3ff',
    light: '#ddd6fe',
    default: '#7c3aed',
    dark: '#5b21b6',
    darkest: '#2e1065',
  },

  background: {
    page: '#f8fafc',
    surface: '#ffffff',
    subtle: '#ede9fe',
    border: '#e2e8f0',
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
} as const

export type Colors = typeof colors
