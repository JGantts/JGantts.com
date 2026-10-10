import type { ExpressionSpecification, Map as MapLibreMap, SymbolLayerSpecification } from 'maplibre-gl'
import { cartography } from './cartography'

export const labelModes = ['both', 'native', 'nativeHangul', 'all', 'latin', 'hangul'] as const
export type LabelMode = typeof labelModes[number]

export const townFonts = ['JGantts Hangul Serif', 'Noto Serif', 'Noto Serif KR']
export const latinFonts = ['Noto Sans']
export const annotationFonts = ['JGantts Hangul Sans', ...latinFonts, 'Noto Sans KR']
// FontFaceSet.load loads matching faces in every listed family, including
// fallbacks. Split by script so Hangul never preloads the old KR subsets.
export async function loadTownLabelFonts(characters: string) {
  const hangul = /\p{Script=Hangul}/u
  const cjk = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Bopomofo}\u3000-\u303f\uff00-\uffef]/u
  const chars = [...characters.normalize('NFC')]
  const groups = [
    [chars.filter(char => hangul.test(char)).join(''), 'JGantts Hangul Serif', 'JGantts Hangul Sans'],
    [chars.filter(char => cjk.test(char) && !hangul.test(char)).join(''), 'Noto Serif KR', 'Noto Sans KR'],
    [chars.filter(char => !hangul.test(char) && !cjk.test(char)).join(''), 'Noto Serif', 'Noto Sans'],
  ]
  await Promise.all(groups.flatMap(([text, serif, sans]) => text ? [
    document.fonts.load(`400 18px "${serif}"`, text),
    document.fonts.load(`300 18px "${sans}"`, text),
  ] : []))
}

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

const offsetTables = new WeakMap<MapLibreMap, Map<string, LabelOffsets>>()

export function rememberLabelOffsets(map: MapLibreMap, imageId: string, offsets: LabelOffsets) {
  let table = offsetTables.get(map)
  if (!table) offsetTables.set(map, table = new Map())
  table.set(imageId, offsets)
}

export function townLabelOffsets(mode: LabelMode, map?: MapLibreMap): ExpressionSpecification {
  const entries = map ? [...(offsetTables.get(map)?.entries() ?? [])] : []
  // GeoJSON array-valued properties become strings in vector tiles. Keep the
  // arrays as style literals and select them by the stable label-image ID.
  if (!entries.length) return ['literal', labelOffsets()]
  return ['match', ['get', `${mode}Image`],
    ...entries.flatMap(([id, offsets]) => [id, ['literal', offsets]]),
    ['literal', labelOffsets()]] as unknown as ExpressionSpecification
}

export type LabelOffsets = (string | [number, number])[]

// Offset the entire image, including readings that extend beyond the native box.
// Eight close candidates keep each name visibly associated with its settlement.
export function labelOffsets(overhang = { left: 0, right: 0, top: 0, bottom: 0 }): LabelOffsets {
  const gap = cartography.labels.markerGapEm
  const left = gap + overhang.left
  const right = -gap - overhang.right
  const top = gap + overhang.top
  const bottom = -gap - overhang.bottom
  return [
    'left', [left, 0], 'right', [right, 0],
    'top-left', [left, top], 'top-right', [right, top],
    'bottom-left', [left, bottom], 'bottom-right', [right, bottom],
    'top', [0, top], 'bottom', [0, bottom],
  ]
}

// Only try positions beside the dot; hide crowded names instead of detaching
// them from their town by searching wider rings.
// Offsets are in ems and still apply only to the primary/native label box.
export const townLabelPlacement: SymbolLayerSpecification['layout'] = {
  'text-variable-anchor-offset': townLabelOffsets('both'),
}
