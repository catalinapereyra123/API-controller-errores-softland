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

export const fontSize = {
  display: '2.5rem',
  h1: '1.875rem',
  h2: '1.5rem',
  h3: '1.25rem',
  h4: '1.125rem',
  bodyLarge: '1rem',
  body: '0.875rem',
  bodySmall: '0.8125rem',
  caption: '0.75rem',
  overline: '0.6875rem',
} as const

export const lineHeight = {
  display: '3rem',
  h1: '2.25rem',
  h2: '2rem',
  h3: '1.75rem',
  h4: '1.5rem',
  bodyLarge: '1.5rem',
  body: '1.25rem',
  bodySmall: '1.125rem',
  caption: '1rem',
  overline: '1rem',
} as const

export const letterSpacing = {
  display: '-0.02em',
  h1: '-0.01em',
  overline: '0.06em',
} as const

type TypeStyleKey = keyof typeof fontSize

const weightByStyle: Record<TypeStyleKey, keyof typeof fontWeight> = {
  display: 'bold',
  h1: 'bold',
  h2: 'semibold',
  h3: 'semibold',
  h4: 'semibold',
  bodyLarge: 'regular',
  body: 'regular',
  bodySmall: 'regular',
  caption: 'regular',
  overline: 'semibold',
}

export const textStyles = Object.fromEntries(
  (Object.keys(fontSize) as TypeStyleKey[]).map((key) => {
    const tracking = (letterSpacing as Partial<Record<TypeStyleKey, string>>)[
      key
    ]
    return [
      key,
      {
        fontFamily: fontFamily.sans.join(', '),
        fontSize: fontSize[key],
        lineHeight: lineHeight[key],
        fontWeight: fontWeight[weightByStyle[key]],
        ...(tracking ? { letterSpacing: tracking } : {}),
      },
    ]
  }),
) as Record<
  TypeStyleKey,
  {
    fontFamily: string
    fontSize: string
    lineHeight: string
    fontWeight: string
    letterSpacing?: string
  }
>

export type FontFamily = typeof fontFamily
export type FontSize = typeof fontSize
export type FontWeight = typeof fontWeight
export type LineHeight = typeof lineHeight
export type LetterSpacing = typeof letterSpacing
export type TextStyles = typeof textStyles
