import { describe, expect, it } from 'vitest'
import { parseTownName } from './rubyLabels'

describe('ruby town names', () => {
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
