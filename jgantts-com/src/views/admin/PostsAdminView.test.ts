import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import PostsAdminView from './PostsAdminView.vue'

const post = {
  id: 'draft', title: null, location: null, date: null, time: null,
  slug: 'draft', bodyMarkdown: '', bodyHtml: '', status: 'draft', media: [],
  createdAt: '2026-09-23T00:00:00Z', updatedAt: '2026-09-23T00:00:00Z',
  publishedAt: null, heroMediaId: null, syndications: [], teaser: '',
  canonicalUrl: '/posts/draft', shareUrl: '/posts/draft',
  socialPreview: { image: null, selectedMediaIds: [], state: 'none', schemaVersion: 1 },
}

class MockXHR {
  static current: MockXHR
  upload = { onprogress: (_event: unknown) => {}, onload: () => {} }
  onload = () => {}
  onerror = () => {}
  onabort = () => {}
  status = 201
  responseText = '{}'
  constructor() { MockXHR.current = this }
  open() {}
  send() {}
  abort() { this.onabort() }
}

let wrapper: ReturnType<typeof mount>
beforeEach(() => {
  vi.stubGlobal('localStorage', { getItem: vi.fn(() => null), setItem: vi.fn(), removeItem: vi.fn() })
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ items: [post] }) }))
  vi.stubGlobal('XMLHttpRequest', MockXHR)
  vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:photo'), revokeObjectURL: vi.fn() }))
})
afterEach(() => {
  wrapper?.unmount()
  vi.unstubAllGlobals()
})

async function startUpload() {
  wrapper = mount(PostsAdminView)
  await flushPromises()
  const input = wrapper.get('input[type="file"]')
  Object.defineProperty(input.element, 'files', { value: [new File(['photo'], 'photo.jpg', { type: 'image/jpeg' })] })
  await input.trigger('change')
  await wrapper.findAll('button').find((button) => button.text() === 'Upload ready photos')!.trigger('click')
  return MockXHR.current
}

describe('photo upload progress', () => {
  it('shows processing until the server responds, including uploads without a computable size', async () => {
    const xhr = await startUpload()
    xhr.upload.onprogress({ lengthComputable: true, loaded: 999, total: 1000 })
    await flushPromises()
    expect(wrapper.get('.upload-status').text()).toBe('uploading · 99%')
    xhr.upload.onload()
    await flushPromises()
    expect(wrapper.get('.upload-status').text()).toContain('Processing photo…')
    expect(wrapper.get('.upload-item progress').attributes('value')).toBeUndefined()
    expect(wrapper.findAll('.upload-item button').every((button) => button.attributes('disabled') !== undefined)).toBe(true)
    expect(wrapper.text()).toContain('Processing photos…')
    xhr.status = 500
    xhr.responseText = JSON.stringify({ error: { message: 'Processing failed.' } })
    xhr.onload()
    await flushPromises()
    expect(wrapper.get('.upload-status').text()).toBe('failed')
    expect(wrapper.text()).toContain('Processing failed.')
    await wrapper.findAll('button').find((button) => button.text() === 'Retry')!.trigger('click')
    const retry = MockXHR.current
    retry.upload.onload()
    await flushPromises()
    expect(wrapper.get('.upload-status').text()).toContain('Processing photo…')
    retry.responseText = JSON.stringify({ id: 'photo', urls: { thumbnail: '/media/photo/thumbnail' }, renditions: [], processingState: 'ready' })
    retry.onload()
    await flushPromises()
    expect(wrapper.get('.upload-status').text()).toBe('uploaded')
    expect(wrapper.find('.upload-item progress').exists()).toBe(false)
    expect(wrapper.text()).toContain('1 photo(s) uploaded.')
  })
})


describe('new draft photos', () => {
  async function createNewDraft() {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true, json: async () => ({ ...post, id: 'new-draft', slug: 'new-draft' }),
    } as Response)
    await wrapper.findAll('button').find((button) => button.text() === 'New draft')!.trigger('click')
    await flushPromises()
  }

  it('clears completed upload previews when opening a new draft', async () => {
    const xhr = await startUpload()
    xhr.responseText = JSON.stringify({ id: 'photo', urls: { thumbnail: '/media/photo/thumbnail' }, renditions: [], processingState: 'ready' })
    xhr.onload()
    await flushPromises()
    expect(wrapper.find('.upload-item').exists()).toBe(true)
    expect(wrapper.find('.media-grid').exists()).toBe(true)

    await createNewDraft()

    expect(wrapper.find('.upload-queue').exists()).toBe(false)
    expect(wrapper.find('.media-grid').exists()).toBe(false)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:photo')
    expect(wrapper.find('input[type="file"]').exists()).toBe(true)
  })

  it('clears an in-flight upload without carrying its result or notice into the new draft', async () => {
    const xhr = await startUpload()
    xhr.upload.onload()
    await flushPromises()
    const abort = vi.spyOn(xhr, 'abort')

    await createNewDraft()

    expect(abort).toHaveBeenCalledOnce()
    expect(wrapper.find('.upload-queue').exists()).toBe(false)
    expect(wrapper.find('.media-grid').exists()).toBe(false)
    expect(wrapper.text()).toContain('Empty draft created.')
    expect(wrapper.text()).not.toContain('photo(s) uploaded.')
  })
})
