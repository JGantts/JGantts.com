import { describe, expect, it } from 'vitest'
import { createExpression, Formatted } from '@maplibre/maplibre-gl-style-spec'
import { townLabel, type LabelMode } from './townLabels'

function render(mode: LabelMode, properties: { name: string; latin?: string }) {
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
  })

  it('selects either spelling independently', () => {
    expect(render('native', bilingual)).toBe(bilingual.name)
    expect(render('latin', bilingual)).toBe(bilingual.latin)
  })

  it('shows a Latin-only entry once at full size', () => {
    const properties = { name: '', latin: 'Çabuoe' }
    expect(render('both', properties).toString()).toBe('Çabuoe')
    expect(render('native', properties)).toBe('Çabuoe')
    expect(render('latin', properties)).toBe('Çabuoe')
  })

  it.each([
    { name: 'Çabuóe' },
    { name: 'Çabuóe', latin: '' },
    { name: 'Çabuóe', latin: 'Çabuóe' },
  ])('keeps one native line without a distinct romanization: %j', properties => {
    expect(render('both', properties).toString()).toBe('Çabuóe')
    expect(render('latin', properties)).toBe('Çabuóe')
  })
})
