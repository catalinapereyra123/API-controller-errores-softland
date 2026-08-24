import { colors, fontFamily, fontSize, fontWeight, radius, spacing, textStyles } from './src/styles'

type FontSizeKey = keyof typeof fontSize

const fontSizeConfig = Object.fromEntries(
  (Object.keys(fontSize) as FontSizeKey[]).map((key) => {
    const style = textStyles[key]
    return [
      key,
      [
        style.fontSize,
        {
          lineHeight: style.lineHeight,
          fontWeight: style.fontWeight,
          ...(style.letterSpacing ? { letterSpacing: style.letterSpacing } : {}),
        },
      ],
    ]
  }),
)

export default {
  theme: {
    extend: {
      colors,
      fontFamily,
      fontWeight,
      fontSize: fontSizeConfig,
      spacing,
      borderRadius: radius,
    },
  },
}
