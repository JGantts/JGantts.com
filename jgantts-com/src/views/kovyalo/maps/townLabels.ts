import type { ExpressionSpecification } from 'maplibre-gl'

export type LabelMode = 'both' | 'native' | 'latin'

export const townFonts = ['Noto Serif', 'Noto Serif KR']

export function townLabel(mode: LabelMode): ExpressionSpecification {
  const nativeName: ExpressionSpecification = [
    'case', ['!=', ['coalesce', ['get', 'name'], ''], ''],
    ['get', 'name'], ['coalesce', ['get', 'latin'], ''],
  ]
  const hasLatin: ExpressionSpecification = [
    'all',
    ['!=', ['coalesce', ['get', 'latin'], ''], ''],
    ['!=', ['get', 'latin'], nativeName],
  ]
  if (mode === 'native') return nativeName
  if (mode === 'latin') return ['case', hasLatin, ['get', 'latin'], nativeName]
  return [
    'format',
    nativeName, {},
    ['case', hasLatin, ['concat', '\n', ['get', 'latin']], ''],
    { 'font-scale': 0.8 },
  ]
}
