import type { ExpressionSpecification } from 'maplibre-gl'

export type LabelMode = 'both' | 'native' | 'latin'

export const townFonts = ['Noto Serif', 'Noto Serif KR']
export const latinFonts = ['Noto Sans']
export const townTextSize = 18

// Only the primary spelling participates in text shaping and anchor placement.
// The visible image's content rectangle maps precisely onto this text box.
export function townLabel(mode: LabelMode): ExpressionSpecification {
  const hasNative: ExpressionSpecification = ['!=', ['coalesce', ['get', 'name'], ''], '']
  const hasLatin: ExpressionSpecification = ['!=', ['coalesce', ['get', 'latin'], ''], '']
  const useLatin: ExpressionSpecification = mode === 'latin' ? hasLatin : ['!', hasNative]
  return [
    'format',
    ['case', useLatin, ['coalesce', ['get', 'latin'], ''], ['coalesce', ['get', 'name'], '']],
    { 'text-font': ['case', useLatin, ['literal', latinFonts], ['literal', townFonts]] },
  ]
}

export function townLabelImage(mode: LabelMode): ExpressionSpecification {
  return ['get', `${mode === 'both' ? 'both' : mode === 'latin' ? 'latin' : 'native'}Image`]
}
