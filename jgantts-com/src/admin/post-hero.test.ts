import { describe, expect, it } from 'vitest'
import { effectiveHeroMediaId } from './post-hero'

describe('effectiveHeroMediaId', () => {
  it('treats the only photo as the default hero', () => {
    expect(effectiveHeroMediaId({ heroMediaId: null, media: [{ id: 'only-photo' }] }))
      .toBe('only-photo')
  })

  it('does not choose implicitly when a post has multiple photos', () => {
    expect(effectiveHeroMediaId({
      heroMediaId: null,
      media: [{ id: 'first' }, { id: 'second' }],
    })).toBeNull()
  })

  it('keeps an explicitly selected hero', () => {
    expect(effectiveHeroMediaId({
      heroMediaId: 'second',
      media: [{ id: 'first' }, { id: 'second' }],
    })).toBe('second')
  })
})
