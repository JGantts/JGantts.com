import type { ExpressionSpecification } from 'maplibre-gl'

export type LabelMode = 'both' | 'native' | 'latin'

export const townFonts = ['Noto Serif', 'Noto Serif KR']
export const latinFonts = ['Noto Sans']
export const townTextSize = 18

export function townLabel(mode: LabelMode): ExpressionSpecification {
  const hasNative: ExpressionSpecification = ['!=', ['coalesce', ['get', 'name'], ''], '']
  const hasLatinName: ExpressionSpecification = ['!=', ['coalesce', ['get', 'latin'], ''], '']
  const nativeFont: ExpressionSpecification = ['case', hasNative, ['literal', townFonts], ['literal', latinFonts]]
  const nativeName: ExpressionSpecification = [
    'case', hasNative,
    ['get', 'name'], ['coalesce', ['get', 'latin'], ''],
  ]
  const hasLatin: ExpressionSpecification = [
    'all',
    ['!=', ['coalesce', ['get', 'latin'], ''], ''],
    ['!=', ['get', 'latin'], nativeName],
  ]
  const latinLine: [ExpressionSpecification, { 'font-scale': number; 'text-font': ExpressionSpecification }] = [
    ['case', hasLatin, ['concat', '\n', ['get', 'latin']], ''],
    { 'font-scale': 0.8, 'text-font': ['literal', latinFonts] },
  ]
  // Inline images keep ruby readings attached to their base text and included
  // in MapLibre's normal label placement/collision detection.
  const nativeLabel: ExpressionSpecification = [
    'case', ['has', 'rubyImage'],
    ['format', ['image', ['get', 'rubyImage']], {}, ...(mode === 'both' ? latinLine : [])],
    ['format', nativeName, { 'text-font': nativeFont }, ...(mode === 'both' ? latinLine : [])],
  ]
  if (mode === 'latin') return [
    'case', hasLatinName,
    ['format', ['get', 'latin'], { 'text-font': ['literal', latinFonts] }],
    nativeLabel,
  ]
  return nativeLabel
}
