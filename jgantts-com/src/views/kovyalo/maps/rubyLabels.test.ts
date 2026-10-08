import { describe, expect, it, vi } from 'vitest'
import type { Map as MapLibreMap } from 'maplibre-gl'
import { parseTownName, renderTownLabel, resolveTownLabels, townNameProperties } from './rubyLabels'

describe('ruby town names', () => {
  it('stacks Latin and Hangul beneath the native title, retaining ruby and skipping missing lines', () => {
    const label = resolveTownLabels('{餉|아똬}', '아똬', 'adua').all
    expect(label.parts).toEqual([{ text: '餉', reading: '아똬' }])
    expect(label.translation).toBe('adua\n아똬')
    expect(resolveTownLabels('餉', '', 'adua').all.translation).toBe('adua')
    expect(resolveTownLabels('餉', '아똬', '').all.translation).toBe('아똬')
    expect(resolveTownLabels('', '아똬', 'adua').all.parts).toEqual([{ text: 'adua' }])
  })

  it('places Hangul beneath Latin-script names as a translation, not ruby', () => {
    const labels = resolveTownLabels('Çabuóe', '싸뾔', 'Cabuo')
    expect(labels.nativeHangul.parts).toEqual([{ text: 'Çabuóe' }])
    expect(labels.nativeHangul.translation).toBe('싸뾔')
    expect(labels.native.translation).toBe('')
    expect(labels.both.translation).toBe('Cabuo')
    expect(labels.hangul.parts).toEqual([{ text: '싸뾔' }])
    expect(resolveTownLabels('Çabuóe').nativeHangul.translation).toBe('')
  })

  it('applies the original modes to a non-Hangul native name', () => {
    const labels = resolveTownLabels('{餉|아똬}', '아똬', 'adua')
    expect(labels.native.parts).toEqual([{ text: '餉', reading: '아똬' }])
    expect(labels.both.parts).toEqual([{ text: '餉', reading: '아똬' }])
    expect(labels.both.translation).toBe('adua')
    expect(labels.nativeHangul.parts).toEqual([{ text: '餉', reading: '아똬' }])
    expect(labels.hangul.parts).toEqual([{ text: '아똬' }])
    expect(labels.latin.parts).toEqual([{ text: 'adua' }])
    expect(labels.latin.latinOnly).toBe(true)
  })

  it('does not infer ruby from the separate Hangul field', () => {
    const labels = resolveTownLabels('倨忒', ':싸뾔', 'Çabuoe')
    expect(labels.native.parts).toEqual([{ text: '倨忒' }])
    expect(labels.nativeHangul.parts).toEqual([{ text: '倨忒' }])
    expect(labels.hangul.parts).toEqual([{ text: ':싸뾔' }])
    expect(resolveTownLabels('Latin name', '읽기').native.parts).toEqual([{ text: 'Latin name' }])
  })

  it('retains divergent ruby for mixed Hangul names in native and Hangul modes', () => {
    const labels = resolveTownLabels('뚜괘 {日|초́까}그{北|핰́따}', 'different generated reading', 'latin')
    for (const mode of ['native', 'both', 'nativeHangul', 'hangul'] as const) {
      expect(labels[mode].parts).toEqual([
        { text: '뚜괘 ' }, { text: '日', reading: '초́까' },
        { text: '그' }, { text: '北', reading: '핰́따' },
      ])
    }
    expect(labels.hangul.translation).toBe('')
  })

  it('handles missing, identical, and normalized spellings according to the mode rules', () => {
    const missing = resolveTownLabels('餉', '', ' ')
    expect(missing.latin).toEqual(missing.native)
    expect(missing.nativeHangul).toEqual(missing.native)
    expect(missing.hangul.parts).toEqual([])
    expect(resolveTownLabels('아똬', ' 아똬 ').hangul.parts).toEqual([{ text: '아똬' }])
    expect(resolveTownLabels('same', '', 'same').both.translation).toBe('same')
  })

  it('keeps native content dimensions and drawing position independent of annotations', () => {
    const draws: { text: string; x: number; y: number; font: string }[] = []
    const ctx = {
      font: '',
      measureText(text: string) {
        const size = Number(this.font.match(/([\d.]+)px/)![1])
        return { width: text.length * size, actualBoundingBoxLeft: text.length * size / 2,
          actualBoundingBoxRight: text.length * size / 2,
          actualBoundingBoxAscent: text ? size * 0.8 : 0, actualBoundingBoxDescent: text ? size * 0.2 : 0 }
      },
      scale() {}, strokeText() {},
      fillText(text: string, x: number, y: number) { draws.push({ text, x, y, font: this.font }) },
      getImageData() { return {} as ImageData },
    }
    const spy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx as unknown as CanvasRenderingContext2D)
    try {
      const samples = [
        renderTownLabel([{ text: '餉' }]),
        renderTownLabel([{ text: '餉', reading: '아똬' }]),
        renderTownLabel([{ text: '餉', reading: '아똬' }], 'a much longer Latin line'),
      ]
      expect(samples.map(({ content: c, pixelRatio: p }) => [(c[2] - c[0]) / p, (c[3] - c[1]) / p]))
        .toEqual([[18, 18], [18, 18], [18, 18]])
      const nativeDraws = draws.filter(draw => draw.text === '餉')
      expect(nativeDraws.map((draw, i) => [
        draw.x - samples[i].content[0] / samples[i].pixelRatio,
        draw.y - samples[i].content[1] / samples[i].pixelRatio,
      ])).toEqual([[9, expect.closeTo(14.4)], [9, expect.closeTo(14.4)], [9, expect.closeTo(14.4)]])
      expect(draws.at(-1)?.font).toContain('300 14.4px')
      expect(draws.find(draw => draw.text === '아똬')?.font).toContain('300 9.9px "Noto Sans", "Noto Sans KR"')
      expect(nativeDraws[0].font).toContain('400 18px "Noto Serif", "Noto Serif KR"')
      draws.length = 0
      const translated = renderTownLabel([{ text: 'Çabuóe' }], '싸뾔', false)
      expect(draws).toHaveLength(2)
      expect(draws[1].y).toBeGreaterThan(draws[0].y)
      expect(draws[1].x).toBe(draws[0].x)
      expect(draws[1].font).toContain('300 14.4px "Noto Sans", "Noto Sans KR"')
      expect((translated.content[3] - translated.content[1]) / translated.pixelRatio).toBe(18)
      draws.length = 0
      const triple = renderTownLabel([{ text: '餉' }], 'adua\n아똬')
      expect(draws.map(draw => draw.text)).toEqual(['餉', 'adua', '아똬'])
      expect(draws[2].y).toBeGreaterThan(draws[1].y)
      expect(draws[1].y).toBeGreaterThan(draws[0].y)
      expect((triple.content[3] - triple.content[1]) / triple.pixelRatio).toBe(18)
    } finally {
      spy.mockRestore()
    }
  })

  it('uses name markup for image identity and excludes markup from native text', () => {
    const map = { hasImage: vi.fn(() => true) } as unknown as MapLibreMap
    const first = townNameProperties(map, '{餉|아똬}', 'generated')
    const second = townNameProperties(map, '{餉|다른}', 'generated')
    expect(first.name).toBe('餉')
    expect(second.nativeImage).not.toBe(first.nativeImage)
    expect(townNameProperties(map, '{餉|아똬}', 'changed').nativeImage).toBe(first.nativeImage)
    expect(townNameProperties(map, '餉', '아똬').nativeImage).not.toBe(first.nativeImage)
  })

  it('keeps native images independent of the Latin spelling', () => {
    const map = { hasImage: vi.fn(() => true) } as unknown as MapLibreMap
    const short = townNameProperties(map, '餉', '아똬', 'adua')
    const long = townNameProperties(map, '餉', '아똬', 'a much longer translation')
    expect(short.nativeImage).toBe(long.nativeImage)
    expect(short.bothImage).not.toBe(long.bothImage)
    expect(townNameProperties(map, '', undefined, 'adua').bothImage).toBe(short.latinImage)
  })

  it('parses a reading separately from its base spelling', () => {
    expect(parseTownName('{餉|아똬}')).toEqual([{ text: '餉', reading: '아똬' }])
  })

  it('preserves surrounding text and multiple adjacent ruby spans', () => {
    expect(parseTownName('과 {餉|아똬}{北|북} 마을')).toEqual([
      { text: '과 ' }, { text: '餉', reading: '아똬' }, { text: '北', reading: '북' }, { text: ' 마을' },
    ])
  })

  it('normalizes Unicode and trims the name and ruby fields', () => {
    expect(parseTownName('  { 餉 | 아똬 }  ')).toEqual([{ text: '餉', reading: '아똬' }])
    expect(parseTownName('  C\u0327abuo\u0301e  ')).toEqual([{ text: 'Çabuóe' }])
    expect(parseTownName('   ')).toEqual([])
  })

  it.each(['{餉}', '{餉|}', '{|아똬}', '{餉|아똬', '{餉|아|똬}', '{餉| }'])('leaves malformed markup readable: %s', name => {
    expect(parseTownName(name)).toEqual([{ text: name }])
  })
})
