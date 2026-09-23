import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { loadAdminPostDraft, removeAdminPostDraft, saveAdminPostDraft, type AdminPostDraft } from './draft-storage'

const draft: AdminPostDraft = {
  bodyMarkdown: 'A body',
  date: '2026-09-22',
  location: 'Philadelphia',
  slug: 'a-post',
  time: '18:10',
  title: 'A post',
}

function memoryStorage(): Storage {
  const values = new Map<string, string>()
  return {
    get length() { return values.size },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => { values.delete(key) },
    setItem: (key, value) => { values.set(key, value) },
  }
}

beforeEach(() => {
  vi.stubGlobal('localStorage', memoryStorage())
  vi.restoreAllMocks()
})

afterEach(() => vi.unstubAllGlobals())

describe('admin draft storage', () => {
  it('round trips a per-post recovery draft', () => {
    expect(saveAdminPostDraft('post-1', draft, '2026-09-22T10:00:00.000Z', 1234)).toBe(true)
    expect(loadAdminPostDraft('post-1')).toEqual({
      draft,
      savedAt: 1234,
      serverUpdatedAt: '2026-09-22T10:00:00.000Z',
      version: 1,
    })
    expect(loadAdminPostDraft('post-2')).toBeNull()
  })

  it('ignores malformed or obsolete records', () => {
    localStorage.setItem('jgantts:admin-post-draft:post-1', JSON.stringify({ version: 0, draft }))
    expect(loadAdminPostDraft('post-1')).toBeNull()
  })

  it('fails safely when browser storage is unavailable', () => {
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new DOMException('denied') })
    expect(saveAdminPostDraft('post-1', draft, '')).toBe(false)
  })

  it('can remove a recovery draft', () => {
    saveAdminPostDraft('post-1', draft, '')
    removeAdminPostDraft('post-1')
    expect(loadAdminPostDraft('post-1')).toBeNull()
  })
})
