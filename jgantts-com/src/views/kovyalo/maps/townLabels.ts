import type { ExpressionSpecification, Map as MapLibreMap, SymbolLayerSpecification } from 'maplibre-gl'

export const labelModes = ['both', 'native', 'nativeHangul', 'latin', 'hangul'] as const
export type LabelMode = typeof labelModes[number]

export const townFonts = ['Noto Serif', 'Noto Serif KR']
export const latinFonts = ['Noto Sans']
export const annotationFonts = [...latinFonts, 'Noto Sans KR']
export const townTextSize = 18

export function townLabelSize(width: number, height: number): number {
  if (width >= 1600 && height >= 900) return 24
  if (width >= 1200 && height >= 700) return 22
  if (width >= 768 && height >= 500) return 20
  return townTextSize
}

export function resizeTownLabels(map: MapLibreMap) {
  const container = map.getContainer()
  const size = townLabelSize(container.clientWidth, container.clientHeight)
  if (map.getLayer('towns-layer') && map.getLayoutProperty('towns-layer', 'text-size') !== size) {
    // Fitted label images scale with the native text box, preserving ruby and
    // translation proportions without rebuilding the image atlas on resize.
    map.setLayoutProperty('towns-layer', 'text-size', size)
  }
}

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
