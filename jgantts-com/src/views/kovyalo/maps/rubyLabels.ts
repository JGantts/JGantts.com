import type { Map as MapLibreMap } from 'maplibre-gl'
import { townFonts, annotationFonts, townTextSize, labelModes, type LabelMode } from './townLabels'

type NamePart = { text: string; reading?: string }

export function parseTownName(value: string): NamePart[] {
  const name = value.trim().normalize('NFC')
  const parts: NamePart[] = []
  let offset = 0
  for (const match of name.matchAll(/\{([^{}|\r\n]+)\|([^{}|\r\n]+)\}/gu)) {
    const text = match[1].trim()
    const reading = match[2].trim()
    if (!text || !reading) continue
    if (match.index! > offset) parts.push({ text: name.slice(offset, match.index) })
    parts.push({ text, reading })
    offset = match.index! + match[0].length
  }
  if (offset < name.length) parts.push({ text: name.slice(offset) })
  return parts
}

export function renderTownLabel(parts: NamePart[], translation = '', latinOnly = false) {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!
  ctx.textAlign = 'center'
  const pixelRatio = Math.max(2, window.devicePixelRatio || 1)
  const readingSize = townTextSize * 0.55
  const translationSize = townTextSize * 0.8
  const font = (size: number, isSans = false) =>
    `${isSans ? 300 : 400} ${size}px ${(isSans ? annotationFonts : townFonts).map(name => `"${name}"`).join(', ')}, ${isSans ? 'sans-serif' : 'serif'}`
  const measure = (text: string, size: number, isSans = false) => {
    ctx.font = font(size, isSans)
    return ctx.measureText(text)
  }
  const runs = parts.map(part => ({
    ...part,
    base: measure(part.text, townTextSize, latinOnly),
    ruby: measure(part.reading ?? '', readingSize, true),
  }))
  // Ruby never expands the base advances. The native line alone defines content.
  const nativeWidth = runs.reduce((sum, run) => sum + run.base.width, 0)
  const ascent = Math.max(0, ...runs.map(run => run.base.actualBoundingBoxAscent))
  const descent = Math.max(0, ...runs.map(run => run.base.actualBoundingBoxDescent))
  const nativeHeight = Math.max(townTextSize, ascent + descent)
  const baseline = (nativeHeight - ascent - descent) / 2 + ascent
  const rubyDescent = Math.max(0, ...runs.map(run => run.ruby.actualBoundingBoxDescent))
  const rubyBaseline = baseline - ascent - 3 - rubyDescent
  const translationMetrics = measure(translation, translationSize, true)
  const translationBaseline = baseline + descent + 5 + translationMetrics.actualBoundingBoxAscent
  let left = 0
  let right = nativeWidth
  let top = 0
  let bottom = nativeHeight
  let advance = 0
  for (const run of runs) {
    const center = advance + run.base.width / 2
    left = Math.min(left, center - run.base.actualBoundingBoxLeft)
    right = Math.max(right, center + run.base.actualBoundingBoxRight)
    if (run.reading) {
      left = Math.min(left, center - run.ruby.width / 2)
      right = Math.max(right, center + run.ruby.width / 2)
      top = Math.min(top, rubyBaseline - run.ruby.actualBoundingBoxAscent)
    }
    advance += run.base.width
  }
  if (translation) {
    left = Math.min(left, (nativeWidth - translationMetrics.width) / 2)
    right = Math.max(right, (nativeWidth + translationMetrics.width) / 2)
    bottom = Math.max(bottom, translationBaseline + translationMetrics.actualBoundingBoxDescent)
  }
  const padding = 3
  // Keep base glyphs on the same pixel grid across native/bilingual images.
  const originX = Math.ceil((padding - left) * pixelRatio) / pixelRatio
  const originY = Math.ceil((padding - top) * pixelRatio) / pixelRatio
  canvas.width = Math.ceil((originX + right + padding) * pixelRatio)
  canvas.height = Math.ceil((originY + bottom + padding) * pixelRatio)
  ctx.scale(pixelRatio, pixelRatio)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.lineJoin = 'round'
  ctx.fillStyle = '#fff'
  ctx.strokeStyle = '#000'
  const draw = (text: string, size: number, x: number, y: number, halo: number, isSans = false) => {
    ctx.font = font(size, isSans)
    ctx.lineWidth = halo * 2
    ctx.strokeText(text, originX + x, originY + y)
    ctx.fillText(text, originX + x, originY + y)
  }
  advance = 0
  for (const run of runs) {
    const center = advance + run.base.width / 2
    draw(run.text, townTextSize, center, baseline, 2, latinOnly)
    if (run.reading) draw(run.reading, readingSize, center, rubyBaseline, 1, true)
    advance += run.base.width
  }
  if (translation) draw(translation, translationSize, nativeWidth / 2, translationBaseline, 2, true)
  // MapLibre fits only this native rectangle to the anchoring text. Everything
  // outside it (ruby, Latin, halo) follows without moving the native line.
  const content: [number, number, number, number] = [
    originX * pixelRatio, originY * pixelRatio,
    (originX + Math.max(1, nativeWidth)) * pixelRatio, (originY + nativeHeight) * pixelRatio,
  ]
  return { image: ctx.getImageData(0, 0, canvas.width, canvas.height), pixelRatio, content }
}

type TownLabelPlan = { parts: NamePart[]; translation: string; latinOnly: boolean }

export function resolveTownLabels(value: string, hangulValue = '', latinValue = ''): Record<LabelMode, TownLabelPlan> {
  const plain = parseTownName(value)
  const name = plain.map(part => part.text).join('')
  const hangul = hangulValue.trim().normalize('NFC')
  const latin = latinValue.trim().normalize('NFC')
  const isHangul = /\p{Script=Hangul}/u.test(name)
  const isLatinName = /\p{Script=Latin}/u.test(name) && !/[\p{Script=Hangul}\p{Script=Han}]/u.test(name)
  const native = { parts: plain, translation: '', latinOnly: false }
  return {
    native,
    both: name ? { ...native, translation: latin }
      : { parts: latin ? [{ text: latin }] : [], translation: '', latinOnly: true },
    nativeHangul: isLatinName
      ? { ...native, translation: hangul }
      : native,
    latin: latin ? { parts: [{ text: latin }], translation: '', latinOnly: true } : native,
    hangul: isHangul ? native
      : { parts: hangul ? [{ text: hangul }] : [], translation: '', latinOnly: false },
  }
}

export function townNameProperties(map: MapLibreMap, value: string, hangul?: string, latinValue = '') {
  const plans = resolveTownLabels(value, hangul, latinValue)
  const properties: Record<string, string | boolean> = {
    name: plans.native.parts.map(part => part.text).join(''),
  }
  for (const mode of labelModes) {
    const { parts, translation, latinOnly } = plans[mode]
    const text = parts.map(part => part.text).join('')
    let id = ''
    if (text) {
      id = `town-label:${JSON.stringify([parts, translation, latinOnly])}`
      if (!map.hasImage(id)) {
        const { image, pixelRatio, content } = renderTownLabel(parts, translation, latinOnly)
        map.addImage(id, image, { pixelRatio, content })
      }
    }
    properties[`${mode}Text`] = text
    properties[`${mode}Latin`] = latinOnly
    properties[`${mode}Image`] = id
  }
  return properties
}
