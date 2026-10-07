import type { ExpressionSpecification, SymbolLayerSpecification } from 'maplibre-gl'

export const labelModes = ['both', 'native', 'nativeHangul', 'latin', 'hangul'] as const
export type LabelMode = typeof labelModes[number]

export const townFonts = ['Noto Serif', 'Noto Serif KR']
export const latinFonts = ['Noto Sans']
export const annotationFonts = [...latinFonts, 'Noto Sans KR']
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

// Try nearby positions first, then wider rings for tight groups of towns.
// Offsets are in ems and still apply only to the primary/native label box.
export const townLabelPlacement: SymbolLayerSpecification['layout'] = {
  'text-variable-anchor-offset': [0.25, 1.25, 2.25].flatMap(distance => {
    const diagonal = distance / Math.SQRT2
    return [
      'top-left', [diagonal, diagonal],
      'top-right', [-diagonal, diagonal],
      'bottom-left', [diagonal, -diagonal],
      'bottom-right', [-diagonal, -diagonal],
      'left', [distance, 0],
      'right', [-distance, 0],
      'bottom', [0, -distance],
      'top', [0, distance],
    ]
  }) as (string | [number, number])[],
}
