import { describe, expect, it } from 'vitest'
import { createExpression } from '@maplibre/maplibre-gl-style-spec'
import { townLabel, townLabelImage, type LabelMode } from './townLabels'

function render(mode: LabelMode, properties: { name: string; latin?: string }) {
  const expression = createExpression(townLabel(mode))
  if (expression.result === 'error') throw new Error(JSON.stringify(expression.value))
  return expression.value.evaluate({ zoom: 6 }, { type: 'Point', properties })
}

describe('town label anchors', () => {
  const bilingual = { name: '뚜괘 日그北', latin: "dookwa loegak ha'da" }

  it('uses exactly the native spelling for both native and bilingual placement', () => {
    for (const mode of ['both', 'native'] as LabelMode[]) {
      const anchor = render(mode, bilingual)
      expect(anchor.toString()).toBe(bilingual.name)
      expect(anchor.sections).toHaveLength(1)
      expect(anchor.sections[0].fontStack).toBe('Noto Serif,Noto Serif KR')
      expect(render(mode, { ...bilingual, latin: 'a much longer Latin line' })).toEqual(anchor)
    }
  })

  it('anchors Latin-only mode by the Latin spelling', () => {
    const anchor = render('latin', bilingual)
    expect(anchor.toString()).toBe(bilingual.latin)
    expect(anchor.sections[0].fontStack).toBe('Noto Sans')
  })

  it('falls back to the available spelling and its font', () => {
    for (const mode of ['both', 'native', 'latin'] as LabelMode[]) {
      expect(render(mode, { name: '', latin: 'Çabuoe' }).toString()).toBe('Çabuoe')
      expect(render(mode, { name: '', latin: 'Çabuoe' }).sections[0].fontStack).toBe('Noto Sans')
      expect(render(mode, { name: '餉', latin: '' }).toString()).toBe('餉')
      expect(render(mode, { name: '餉' }).sections[0].fontStack).toBe('Noto Serif,Noto Serif KR')
    }
  })

  it('selects the visible image for each display mode', () => {
    expect(townLabelImage('both')).toEqual(['get', 'bothImage'])
    expect(townLabelImage('native')).toEqual(['get', 'nativeImage'])
    expect(townLabelImage('latin')).toEqual(['get', 'latinImage'])
  })
})
