import type { Map as MapLibreMap } from 'maplibre-gl'
import { townFonts, latinFonts, townTextSize } from './townLabels'

type NamePart = { text: string; reading?: string }

function alignReading(name: string, hangul: string): NamePart[] {
  const base = [...name]
  const reading = [...hangul]
  // Shared characters anchor each differing span, including mixed Han/Hangul names.
  const lengths = Array.from({ length: base.length + 1 }, () => new Uint32Array(reading.length + 1))
  for (let i = base.length - 1; i >= 0; i--) {
    for (let j = reading.length - 1; j >= 0; j--) {
      lengths[i][j] = base[i] === reading[j]
        ? lengths[i + 1][j + 1] + 1
        : Math.max(lengths[i + 1][j], lengths[i][j + 1])
    }
  }
  const parts: NamePart[] = []
  const append = (text: string, ruby = '') => {
    if (!text) return
    const previous = parts.at(-1)
    if (!ruby && previous && !previous.reading) previous.text += text
    else parts.push(ruby ? { text, reading: ruby } : { text })
  }
  let i = 0
  let j = 0
  let text = ''
  let ruby = ''
  while (i < base.length || j < reading.length) {
    if (i < base.length && j < reading.length && base[i] === reading[j]) {
      // An inserted reading needs a base character to remain attached to.
      if (!text && ruby) append(base[i], ruby + reading[j])
      else {
        append(text, ruby)
        append(base[i])
      }
      text = ''
      ruby = ''
      i++
      j++
    } else if (i < base.length && (j === reading.length || lengths[i + 1][j] >= lengths[i][j + 1])) {
      text += base[i++]
    } else {
      ruby += reading[j++]
    }
  }
  if (!text && ruby && parts.length) {
    const previous = parts.pop()!
    const characters = [...previous.text]
    if (previous.reading) append(previous.text, previous.reading + ruby)
    else {
      append(characters.slice(0, -1).join(''))
      append(characters.at(-1)!, characters.at(-1)! + ruby)
    }
  } else append(text, ruby)
  return parts
}

export function parseTownName(value: string, hangul?: string): NamePart[] {
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
  const reading = hangul?.trim().normalize('NFC')
  const base = parts.map(part => part.text).join('')
  if (base && reading) return alignReading(base, reading)
  return parts
}

export function renderTownLabel(parts: NamePart[], latin = '', latinOnly = false) {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!
  ctx.textAlign = 'center'
  const pixelRatio = Math.max(2, window.devicePixelRatio || 1)
  const readingSize = townTextSize * 0.55
  const latinSize = townTextSize * 0.8
  const font = (size: number, isLatin = false) =>
    `${isLatin ? 300 : 400} ${size}px ${(isLatin ? latinFonts : townFonts).map(name => `"${name}"`).join(', ')}, ${isLatin ? 'sans-serif' : 'serif'}`
  const measure = (text: string, size: number, isLatin = false) => {
    ctx.font = font(size, isLatin)
    return ctx.measureText(text)
  }
  const runs = parts.map(part => ({
    ...part,
    base: measure(part.text, townTextSize, latinOnly),
    ruby: measure(part.reading ?? '', readingSize),
  }))
  // Ruby never expands the base advances. The native line alone defines content.
  const nativeWidth = runs.reduce((sum, run) => sum + run.base.width, 0)
  const ascent = Math.max(0, ...runs.map(run => run.base.actualBoundingBoxAscent))
  const descent = Math.max(0, ...runs.map(run => run.base.actualBoundingBoxDescent))
  const nativeHeight = Math.max(townTextSize, ascent + descent)
  const baseline = (nativeHeight - ascent - descent) / 2 + ascent
  const rubyDescent = Math.max(0, ...runs.map(run => run.ruby.actualBoundingBoxDescent))
  const rubyBaseline = baseline - ascent - 3 - rubyDescent
  const latinMetrics = measure(latin, latinSize, true)
  const latinBaseline = baseline + descent + 5 + latinMetrics.actualBoundingBoxAscent
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
  if (latin) {
    left = Math.min(left, (nativeWidth - latinMetrics.width) / 2)
    right = Math.max(right, (nativeWidth + latinMetrics.width) / 2)
    bottom = Math.max(bottom, latinBaseline + latinMetrics.actualBoundingBoxDescent)
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
  const draw = (text: string, size: number, x: number, y: number, halo: number, isLatin = false) => {
    ctx.font = font(size, isLatin)
    ctx.lineWidth = halo * 2
    ctx.strokeText(text, originX + x, originY + y)
    ctx.fillText(text, originX + x, originY + y)
  }
  advance = 0
  for (const run of runs) {
    const center = advance + run.base.width / 2
    draw(run.text, townTextSize, center, baseline, 2, latinOnly)
    if (run.reading) draw(run.reading, readingSize, center, rubyBaseline, 1)
    advance += run.base.width
  }
  if (latin) draw(latin, latinSize, nativeWidth / 2, latinBaseline, 2, true)
  // MapLibre fits only this native rectangle to the anchoring text. Everything
  // outside it (ruby, Latin, halo) follows without moving the native line.
  const content: [number, number, number, number] = [
    originX * pixelRatio, originY * pixelRatio,
    (originX + Math.max(1, nativeWidth)) * pixelRatio, (originY + nativeHeight) * pixelRatio,
  ]
  return { image: ctx.getImageData(0, 0, canvas.width, canvas.height), pixelRatio, content }
}

export function townNameProperties(map: MapLibreMap, value: string, hangul?: string, latinValue = '') {
  const parts = parseTownName(value, hangul)
  const name = parts.map(part => part.text).join('')
  const latin = latinValue.trim().normalize('NFC')
  const register = (base: NamePart[], translation = '', latinOnly = false) => {
    if (!base.length) return ''
    const id = `town-label:${JSON.stringify([base, translation, latinOnly])}`
    if (!map.hasImage(id)) {
      const { image, pixelRatio, content } = renderTownLabel(base, translation, latinOnly)
      map.addImage(id, image, { pixelRatio, content })
    }
    return id
  }
  const nativeParts = name ? parts : latin ? [{ text: latin }] : []
  const nativeImage = register(nativeParts, '', !name)
  return {
    name,
    nativeImage,
    bothImage: name && latin && latin !== name ? register(parts, latin) : nativeImage,
    latinImage: latin ? register([{ text: latin }], '', true) : nativeImage,
  }
}
