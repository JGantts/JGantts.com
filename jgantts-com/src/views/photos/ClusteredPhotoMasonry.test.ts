import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ClusteredPhotoMasonry from './ClusteredPhotoMasonry.vue'
import type { PhotoCommentsAttachment } from './photo-comments-types'

function attachment(id: string): PhotoCommentsAttachment {
  return {
    description: id,
    meta: { original: { aspect: 1, height: 800, width: 800 } },
    preview_url: `/${id}-preview.jpg`,
    type: 'image',
    url: `/${id}.jpg`,
  }
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
  vi.stubGlobal('CSS', { escape: (value: string) => value })
  vi.stubGlobal('ResizeObserver', class {
    constructor(private readonly callback: ResizeObserverCallback) {}
    disconnect() {}
    observe() {
      this.callback([{ contentRect: { width: 900 } } as ResizeObserverEntry], this as unknown as ResizeObserver)
    }
    unobserve() {}
  })
  vi.stubGlobal('IntersectionObserver', class {
    readonly root = null
    readonly rootMargin = '0px'
    readonly scrollMargin = '0px'
    readonly thresholds = [0, 0.5, 0.75, 1]
    disconnect() {}
    observe() {}
    takeRecords() { return [] }
    unobserve() {}
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('ClusteredPhotoMasonry selection', () => {
  it('selects the clicked photo post when a different post is active', async () => {
    const wrapper = mount(ClusteredPhotoMasonry, {
      props: {
        activePostId: 'post-b',
        posts: [
          { content: '<p>A</p>', created_at: '2026-09-20T12:00:00Z', id: 'post-a', media_attachments: [attachment('a')] },
          { content: '<p>B</p>', created_at: '2026-09-21T12:00:00Z', id: 'post-b', media_attachments: [attachment('b')] },
        ],
      },
      global: {
        stubs: { ResponsivePhoto: true, Teleport: true },
      },
    })

    await wrapper.vm.$nextTick()
    const photoA = wrapper.get('[data-cluster-key="post-a"] .photo-card')
    expect(photoA.attributes('aria-label')).toContain('Select post from')
    await photoA.trigger('click')

    expect(wrapper.emitted('select')).toEqual([[0]])
    expect(wrapper.emitted('clear')).toBeUndefined()
    wrapper.unmount()
  })
})
