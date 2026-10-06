import type { ExpressionSpecification } from 'maplibre-gl'

export type LabelMode = 'both' | 'native' | 'latin'

export const townFonts = ['Noto Serif', 'Noto Serif KR']
export const latinFonts = ['Noto Sans']

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
  if (mode === 'native') return ['format', nativeName, { 'text-font': nativeFont }]
  if (mode === 'latin') return [
    'format', ['case', hasLatinName, ['get', 'latin'], nativeName],
    { 'text-font': ['case', hasLatinName, ['literal', latinFonts], nativeFont] },
  ]
  return [
    'format',
    nativeName, { 'text-font': nativeFont },
    ['case', hasLatin, ['concat', '\n', ['get', 'latin']], ''],
    { 'font-scale': 0.8, 'text-font': ['literal', latinFonts] },
  ]
}
