import type { ExpressionSpecification, Map as MapLibreMap, SymbolLayerSpecification } from 'maplibre-gl'

export const labelModes = ['both', 'native', 'nativeHangul', 'all', 'latin', 'hangul'] as const
export type LabelMode = typeof labelModes[number]

export const townFonts = ['JGantts Hangul Serif', 'Noto Serif', 'Noto Serif KR']
export const latinFonts = ['Noto Sans']
export const annotationFonts = ['JGantts Hangul Sans', ...latinFonts, 'Noto Sans KR']
export const townTextSize = 18
export const maxTownTextSize = 24

export function townLabelPixelRatio(displayPixelRatio: number): number {
  // Cover the largest responsive size and keep the atlas ratio above the map's
  // ratio. MapLibre then retains linear filtering after zooming stops instead
  // of switching these fitted text images to nearest-neighbor sampling.
  return Math.max(2, Math.ceil(displayPixelRatio * maxTownTextSize / townTextSize))
}

export function townLabelSize(width: number, height: number): number {
  if (width >= 1600 && height >= 900) return maxTownTextSize
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

// The primary spelling defines text shaping and the anchor. The visible image's
// content rectangle maps onto this box; its outer bounds also participate in collisions.
export function townLabel(mode: LabelMode): ExpressionSpecification {
  return [
    'format', ['get', `${mode}Text`],
    { 'text-font': ['case', ['get', `${mode}Latin`], ['literal', latinFonts], ['literal', townFonts]] },
  ]
}

export function townLabelImage(mode: LabelMode): ExpressionSpecification {
  return ['get', `${mode}Image`]
}

// Only try positions beside the dot; hide crowded names instead of detaching
// them from their town by searching wider rings.
// Offsets are in ems and still apply only to the primary/native label box.
export const townLabelPlacement: SymbolLayerSpecification['layout'] = {
  'text-variable-anchor-offset': [0.25].flatMap(distance => {
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
