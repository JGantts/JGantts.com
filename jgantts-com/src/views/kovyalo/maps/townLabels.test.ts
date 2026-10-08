import { describe, expect, it } from 'vitest'
import { createExpression } from '@maplibre/maplibre-gl-style-spec'
import { townLabel, townLabelImage, townLabelSize, townLabelPixelRatio, townTextSize, maxTownTextSize, labelModes, type LabelMode } from './townLabels'

import type { Map as MapLibreMap } from 'maplibre-gl'
import { townNameProperties } from './rubyLabels'

function render(mode: LabelMode, town: { name: string; latin?: string; hangul?: string }) {
  const properties = townNameProperties({ hasImage: () => true } as unknown as MapLibreMap, town.name, town.hangul, town.latin)
  const expression = createExpression(townLabel(mode))
  if (expression.result === 'error') throw new Error(JSON.stringify(expression.value))
  return expression.value.evaluate({ zoom: 6 }, { type: 'Point', properties })
}

describe('town label anchors', () => {
  it.each([1, 1.25, 1.5, 2, 2.5, 3, 4])('keeps smooth sampling and enough image detail at display ratio %s', ratio => {
    const imageRatio = townLabelPixelRatio(ratio)
    expect(imageRatio).toBeGreaterThan(ratio)
    expect(imageRatio * townTextSize).toBeGreaterThanOrEqual(ratio * maxTownTextSize)
  })

  it.each([
    [390, 844, 18], [844, 390, 18], [767, 900, 18],
    [768, 500, 20], [1199, 900, 20], [1200, 699, 20],
    [1200, 700, 22], [1599, 1000, 22], [1600, 899, 22],
    [1600, 900, 24], [2560, 1440, 24], [1920, 400, 18],
  ])('sizes labels for a %i × %i map to %i pixels', (width, height, size) => {
    expect(townLabelSize(width, height)).toBe(size)
  })

  const bilingual = { name: '뚜괘 日그北', latin: "dookwa loegak ha'da" }

  it('uses exactly the native spelling for both native and bilingual placement', () => {
    for (const mode of ['both', 'native', 'nativeHangul'] as LabelMode[]) {
      const anchor = render(mode, bilingual)
      expect(anchor.toString()).toBe(bilingual.name)
      expect(anchor.sections).toHaveLength(1)
      expect(anchor.sections[0].fontStack).toBe('Noto Serif,Noto Serif KR')
      expect(render(mode, { ...bilingual, latin: 'a much longer Latin line' })).toEqual(anchor)
    }
  })

  it('anchors Latin-only mode by the Latin spelling', () => {
    const anchor = render('latin', bilingual)
    expect(anchor.toString()).toBe('dookwa loegak hada')
    expect(anchor.sections[0].fontStack).toBe('Noto Sans')
  })

  it('uses the Latin fallback and leaves missing standalone names empty', () => {
    expect(render('latin', { name: '餉' }).toString()).toBe('餉')
    expect(render('latin', { name: '餉' }).sections[0].fontStack).toBe('Noto Serif,Noto Serif KR')
    expect(render('both', { name: '', latin: 'Çabuoe' }).toString()).toBe('Çabuoe')
    expect(render('native', { name: '', latin: 'Çabuoe' }).toString()).toBe('')
    expect(render('hangul', { name: '餉' }).toString()).toBe('')
  })

  it('anchors Hangul mode to the mixed name or standalone Hangul field', () => {
    expect(render('hangul', { ...bilingual, hangul: '뚜괘 조까그캎따' }).toString()).toBe(bilingual.name)
    expect(render('hangul', { name: '餉', hangul: '아똬' }).toString()).toBe('아똬')
    expect(render('nativeHangul', { name: '餉', hangul: '아똬' }).toString()).toBe('餉')
  })

  it('selects the visible image for each display mode', () => {
    for (const mode of labelModes) expect(townLabelImage(mode)).toEqual(['get', `${mode}Image`])
  })
})
