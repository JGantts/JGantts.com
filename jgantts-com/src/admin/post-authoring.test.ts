import { describe, expect, it } from 'vitest'
import type { AdminPostDraft } from './draft-storage'
import { authorPostBody } from './post-authoring'

const draft: AdminPostDraft = {
  bodyMarkdown: 'A sentence in progress ',
  date: '2026-09-23',
  location: 'Southern Appalachia ',
  slug: 'a-post ',
  time: '18:10',
  title: 'A title in progress ',
}

describe('authorPostBody', () => {
  it('preserves in-progress whitespace in autosave payloads', () => {
    expect(authorPostBody(draft, {
      existingPost: true,
      includeSlug: false,
      preserveWhitespace: true,
    })).toEqual({
      bodyMarkdown: 'A sentence in progress ',
      date: 20260923,
      location: 'Southern Appalachia ',
      time: '18:10',
      title: 'A title in progress ',
    })
  })

  it('normalizes metadata when the author explicitly saves', () => {
    expect(authorPostBody(draft, { existingPost: true })).toEqual({
      bodyMarkdown: 'A sentence in progress ',
      date: 20260923,
      location: 'Southern Appalachia',
      slug: 'a-post',
      time: '18:10',
      title: 'A title in progress',
    })
  })
})
