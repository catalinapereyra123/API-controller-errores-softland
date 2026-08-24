/**
 * Design system tokens — single source of truth, consumed by tailwind.config.ts.
 */

export const colors = {
  // Brand (violet), matches the app mark
  primary: {
    50: '#f5f3ff',
    100: '#ede9fe',
    200: '#ddd6fe',
    300: '#c4b5fd',
    400: '#a78bfa',
    500: '#8b5cf6',
    600: '#7c3aed',
    700: '#6d28d9',
    800: '#5b21b6',
    900: '#4c1d95',
    950: '#2e1065',
  },
  // Surfaces, borders, text
  neutral: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
    950: '#020617',
  },
  // Estado resuelto (S)
  success: {
    50: '#ecfdf5',
    100: '#d1fae5',
    200: '#a7f3d0',
    500: '#10b981',
    600: '#059669',
    700: '#047857',
    900: '#064e3b',
  },
  // Sin responsable / demorado
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    900: '#78350f',
  },
  // Estado de error (B, D, E)
  danger: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    900: '#7f1d1d',
  },
  // En reproceso / pendiente
  info: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    500: '#0ea5e9',
    600: '#0284c7',
    700: '#0369a1',
    900: '#0c4a6e',
  },
} as const

export const fontFamily = {
  sans: [
    'Inter',
    'ui-sans-serif',
    'system-ui',
    '-apple-system',
    'Segoe UI',
    'Roboto',
    'Helvetica Neue',
    'Arial',
    'sans-serif',
  ],
  // Ids/codigos: VIS-29904, SAR_CORMVH, estados B/D/E/N/S
  mono: [
    'JetBrains Mono',
    'ui-monospace',
    'SFMono-Regular',
    'SF Mono',
    'Menlo',
    'Consolas',
    'Liberation Mono',
    'monospace',
  ],
} as const

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const

type FontSizeEntry = [string, { lineHeight: string; letterSpacing?: string; fontWeight?: string }]

export const fontSize: Record<string, FontSizeEntry> = {
  display: ['2.5rem', { lineHeight: '3rem', letterSpacing: '-0.02em', fontWeight: fontWeight.bold }],
  h1: ['1.875rem', { lineHeight: '2.25rem', letterSpacing: '-0.01em', fontWeight: fontWeight.bold }],
  h2: ['1.5rem', { lineHeight: '2rem', letterSpacing: '-0.01em', fontWeight: fontWeight.semibold }],
  h3: ['1.25rem', { lineHeight: '1.75rem', fontWeight: fontWeight.semibold }],
  h4: ['1.125rem', { lineHeight: '1.5rem', fontWeight: fontWeight.semibold }],
  'body-lg': ['1rem', { lineHeight: '1.5rem' }],
  body: ['0.875rem', { lineHeight: '1.25rem' }],
  'body-sm': ['0.8125rem', { lineHeight: '1.125rem' }],
  caption: ['0.75rem', { lineHeight: '1rem' }],
  overline: ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.06em', fontWeight: fontWeight.semibold }],
}

// Base unit 0.25rem (4px), plus layout aliases for the numeric scale
export const spacing = {
  card: '1.25rem',
  section: '2rem',
  gutter: '1.5rem',
} as const

export const borderRadius = {
  xs: '0.25rem',
  sm: '0.375rem',
  md: '0.5rem',
  lg: '0.75rem',
  xl: '1rem',
  '2xl': '1.5rem',
} as const
