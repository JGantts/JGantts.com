import { describe, expect, it } from 'vitest'
import { createExpression, Formatted } from '@maplibre/maplibre-gl-style-spec'
import { townLabel, type LabelMode } from './townLabels'

function render(mode: LabelMode, properties: { name: string; latin?: string; rubyImage?: string }) {
  const expression = createExpression(townLabel(mode))
  if (expression.result === 'error') throw new Error(JSON.stringify(expression.value))
  return expression.value.evaluate({ zoom: 6 }, { type: 'Point', properties })
}

describe('town labels', () => {
  const bilingual = { name: '과 日윽北', latin: "kwai lougak ha'da" }

  it('renders native and smaller Latin text together', () => {
    const label = render('both', bilingual) as Formatted
    expect(label.toString()).toBe("과 日윽北\nkwai lougak ha'da")
    expect(label.sections[1].scale).toBe(0.8)
    expect(label.sections[0].fontStack).toBe('Noto Serif,Noto Serif KR')
    expect(label.sections[1].fontStack).toBe('Noto Sans')
  })

  it('selects either spelling independently', () => {
    expect(render('native', bilingual).toString()).toBe(bilingual.name)
    expect(render('latin', bilingual).toString()).toBe(bilingual.latin)
  })

  it('uses the font of the available spelling in single-language modes', () => {
    expect(render('native', bilingual).sections[0].fontStack).toBe('Noto Serif,Noto Serif KR')
    expect(render('latin', bilingual).sections[0].fontStack).toBe('Noto Sans')
    expect(render('latin', { name: '과' }).sections[0].fontStack).toBe('Noto Serif,Noto Serif KR')
    for (const mode of ['both', 'native', 'latin'] as LabelMode[]) {
      expect(render(mode, { name: '', latin: 'Çabuoe' }).sections[0].fontStack).toBe('Noto Sans')
    }
  })

  it('shows a Latin-only entry once at full size', () => {
    const properties = { name: '', latin: 'Çabuoe' }
    expect(render('both', properties).toString()).toBe('Çabuoe')
    expect(render('native', properties).toString()).toBe('Çabuoe')
    expect(render('latin', properties).toString()).toBe('Çabuoe')
  })

  it.each([
    { name: 'Çabuóe' },
    { name: 'Çabuóe', latin: '' },
    { name: 'Çabuóe', latin: 'Çabuóe' },
  ])('keeps one native line without a distinct romanization: %j', properties => {
    expect(render('both', properties).toString()).toBe('Çabuóe')
    expect(render('latin', properties).toString()).toBe('Çabuóe')
  })

  it('keeps ruby above the native name with a separate smaller Latin line', () => {
    const properties = { name: '餉', latin: 'adua', rubyImage: 'town-ruby:{餉|아똬}' }
    const label = render('both', properties) as Formatted
    expect(label.sections[0].image?.name).toBe(properties.rubyImage)
    expect(label.sections[1].text).toBe('\nadua')
    expect(label.sections[1].scale).toBe(0.8)
    expect(label.sections[1].fontStack).toBe('Noto Sans')
    expect(render('native', properties).sections).toHaveLength(1)
    expect(render('native', properties).sections[0].image?.name).toBe(properties.rubyImage)
    expect(render('latin', properties).toString()).toBe('adua')
  })

  it('preserves ruby when Latin mode falls back to the native name', () => {
    const properties = { name: '餉', rubyImage: 'town-ruby:{餉|아똬}' }
    expect(render('latin', properties).sections[0].image?.name).toBe(properties.rubyImage)
    expect(render('both', { ...properties, latin: '餉' }).sections[1].text).toBe('')
  })
})
