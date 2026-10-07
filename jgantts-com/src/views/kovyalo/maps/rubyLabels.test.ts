import { describe, expect, it, vi } from 'vitest'
import type { Map as MapLibreMap } from 'maplibre-gl'
import { parseTownName, townNameProperties } from './rubyLabels'

describe('ruby town names', () => {
  it('adds ruby only over differing spans from the hangul field', () => {
    expect(parseTownName('餉', '아똬')).toEqual([{ text: '餉', reading: '아똬' }])
    expect(parseTownName('뚜괘 日그北', '뚜괘 조까그캎따')).toEqual([
      { text: '뚜괘 ' }, { text: '日', reading: '조까' },
      { text: '그' }, { text: '北', reading: '캎따' },
    ])
    expect(parseTownName(' 餉 ', ' 아똬 ')).toEqual([{ text: '餉', reading: '아똬' }])
  })

  it('ignores blank readings and readings without a native name', () => {
    expect(parseTownName('餉', '  ')).toEqual([{ text: '餉' }])
    expect(parseTownName('', '아똬')).toEqual([])
  })

  it('leaves identical names plain after Unicode normalization', () => {
    expect(parseTownName('아똬', '아똬')).toEqual([{ text: '아똬' }])
  })

  it('preserves shared suffixes and adjacent divergent characters', () => {
    expect(parseTownName('日北 마을', '조까캎따 마을')).toEqual([
      { text: '日北', reading: '조까캎따' }, { text: ' 마을' },
    ])
    expect(parseTownName('𠮷 마을', '길 마을')).toEqual([
      { text: '𠮷', reading: '길' }, { text: ' 마을' },
    ])
  })

  it('keeps insertions attached and preserves base-only characters', () => {
    expect(parseTownName('가나', '다가나')).toEqual([{ text: '가', reading: '다가' }, { text: '나' }])
    expect(parseTownName('가나', '가나다')).toEqual([{ text: '가' }, { text: '나', reading: '나다' }])
    expect(parseTownName('가나다', '가다')).toEqual([{ text: '가나다' }])
  })

  it('prefers the separate reading over legacy markup', () => {
    expect(parseTownName('{餉|old}', '아똬')).toEqual([{ text: '餉', reading: '아똬' }])
  })

  it('includes the reading in image identity and keeps the plain native name', () => {
    const map = { hasImage: vi.fn(() => true), addImage: vi.fn() } as unknown as MapLibreMap
    const first = townNameProperties(map, '餉', '아똬')
    const second = townNameProperties(map, '餉', '다른')
    expect(first.name).toBe('餉')
    expect(first.rubyImage).toBeTruthy()
    expect(second.rubyImage).not.toBe(first.rubyImage)
    expect(townNameProperties(map, ' 餉 ', ' 아똬 ')).toEqual(first)
    expect(townNameProperties(map, '餉', ' ')).toEqual({ name: '餉' })
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
