import type { Map as MapLibreMap } from 'maplibre-gl'
import { townFonts, townTextSize } from './townLabels'

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

function renderRubyName(parts: NamePart[]) {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!
  const pixelRatio = Math.max(2, window.devicePixelRatio || 1)
  const readingSize = townTextSize * 0.55
  const font = (size: number) => `400 ${size}px ${townFonts.map(name => `"${name}"`).join(', ')}, serif`
  const measure = (text: string, size: number) => {
    ctx.font = font(size)
    return ctx.measureText(text)
  }
  const runs = parts.map(part => {
    const base = measure(part.text, townTextSize)
    const reading = measure(part.reading ?? '', readingSize)
    return { ...part, base, readingMetrics: reading, width: Math.max(base.width, reading.width) + (part.reading ? 2 : 0) }
  })
  const baseAscent = Math.max(...runs.map(run => run.base.actualBoundingBoxAscent))
  const baseDescent = Math.max(...runs.map(run => run.base.actualBoundingBoxDescent))
  const readingAscent = Math.max(...runs.map(run => run.readingMetrics.actualBoundingBoxAscent))
  const readingDescent = Math.max(...runs.map(run => run.readingMetrics.actualBoundingBoxDescent))
  const padding = 3 // Leave room for the halo on all four sides.
  const readingBaseline = padding + readingAscent
  const baseBaseline = readingBaseline + readingDescent + 3 + baseAscent
  const width = Math.ceil(runs.reduce((sum, run) => sum + run.width, 0) + padding * 2)
  const height = Math.ceil(baseBaseline + baseDescent + padding)
  canvas.width = Math.ceil(width * pixelRatio)
  canvas.height = Math.ceil(height * pixelRatio)
  ctx.scale(pixelRatio, pixelRatio)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.lineJoin = 'round'
  ctx.fillStyle = '#fff'
  ctx.strokeStyle = '#000'
  const draw = (text: string, size: number, x: number, y: number, halo: number) => {
    ctx.font = font(size)
    ctx.lineWidth = halo * 2
    ctx.strokeText(text, x, y)
    ctx.fillText(text, x, y)
  }
  let x = padding
  for (const run of runs) {
    const center = x + run.width / 2
    draw(run.text, townTextSize, center, baseBaseline, 2)
    if (run.reading) draw(run.reading, readingSize, center, readingBaseline, 1)
    x += run.width
  }
  return { image: ctx.getImageData(0, 0, canvas.width, canvas.height), pixelRatio }
}

export function townNameProperties(map: MapLibreMap, value: string, hangul?: string): { name: string; rubyImage?: string } {
  const parts = parseTownName(value, hangul)
  const name = parts.map(part => part.text).join('')
  if (!parts.some(part => part.reading)) return { name }

  const rubyImage = `town-ruby:${JSON.stringify(parts)}`
  if (!map.hasImage(rubyImage)) {
    const { image, pixelRatio } = renderRubyName(parts)
    map.addImage(rubyImage, image, { pixelRatio })
  }
  return { name, rubyImage }
}
