import type { ExpressionSpecification } from 'maplibre-gl'

export const labelModes = ['both', 'native', 'nativeHangul', 'latin', 'hangul'] as const
export type LabelMode = typeof labelModes[number]

export const townFonts = ['Noto Serif', 'Noto Serif KR']
export const latinFonts = ['Noto Sans']
export const townTextSize = 18

// Only the primary spelling participates in text shaping and anchor placement.
// The visible image's content rectangle maps precisely onto this text box.
export function townLabel(mode: LabelMode): ExpressionSpecification {
  return [
    'format', ['get', `${mode}Text`],
    { 'text-font': ['case', ['get', `${mode}Latin`], ['literal', latinFonts], ['literal', townFonts]] },
  ]
}

export function townLabelImage(mode: LabelMode): ExpressionSpecification {
  return ['get', `${mode}Image`]
}
