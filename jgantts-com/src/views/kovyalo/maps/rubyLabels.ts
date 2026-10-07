import type { Map as MapLibreMap } from 'maplibre-gl'
import { townFonts, townTextSize } from './townLabels'

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

export function townNameProperties(map: MapLibreMap, value: string): { name: string; rubyImage?: string } {
  const parts = parseTownName(value)
  const name = parts.map(part => part.text).join('')
  if (!parts.some(part => part.reading)) return { name }

  const rubyImage = `town-ruby:${value.trim().normalize('NFC')}`
  if (!map.hasImage(rubyImage)) {
    const { image, pixelRatio } = renderRubyName(parts)
    map.addImage(rubyImage, image, { pixelRatio })
  }
  return { name, rubyImage }
}
