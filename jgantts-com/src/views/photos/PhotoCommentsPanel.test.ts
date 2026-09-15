import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import PhotoCommentsPanel from './PhotoCommentsPanel.vue'
import type { PhotoCommentsStatus } from './photo-comments-types'

const post: PhotoCommentsStatus = {
  account: {
    acct: 'photographer',
    avatar: '/avatar.png',
    display_name: 'Photographer',
    url: '/author',
    username: 'photographer',
  },
  content: '<p>A long-form photo description.</p>',
  created_at: '2026-09-14T12:00:00.000Z',
  favourites_count: 0,
  id: 'local:photo-1',
  in_reply_to_id: null,
  media_attachments: [],
  mentions: [],
  reblogs_count: 0,
  replies_count: 0,
  sensitive: false,
  spoiler_text: '',
  tags: [],
  uri: '/photos/photo-1',
  url: '/photos/photo-1',
  visibility: 'public',
}

const baseProps = {
  comments: [],
  discussionState: 'available' as const,
  emailShareUrl: 'mailto:?subject=Photo',
  facebookShareUrl: 'https://facebook.example/share',
  linkedinShareUrl: 'https://linkedin.example/share',
  open: false,
  post,
  qrCodeUrl: '',
  qrDownloadName: 'photo-1-qr-code.png',
  remoteUrl: null,
  replyCount: 0,
  shareStatus: '',
  stale: false,
  truncated: false,
  xShareUrl: 'https://x.example/share',
}

function mockMatchMedia(matches: boolean) {
  const listeners = new Set<(event: MediaQueryListEvent) => void>()
  vi.stubGlobal('matchMedia', vi.fn(() => ({
    addEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => listeners.add(listener),
    dispatchEvent: () => true,
    matches,
    media: '(max-width: 64rem), (max-height: 36rem)',
    onchange: null,
    removeEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => listeners.delete(listener),
  })))
}

beforeEach(() => {
  history.replaceState({}, '', '/photos/photo-1')
  document.documentElement.style.cssText = ''
  document.body.style.cssText = ''
  vi.stubGlobal('scrollTo', vi.fn())
  Object.defineProperty(window, 'scrollY', { configurable: true, value: 240 })
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  document.documentElement.style.cssText = ''
  document.body.style.cssText = ''
})

describe('PhotoCommentsPanel', () => {
  it('uses a compact trigger and keeps the sheet out of the accessibility tree while closed', async () => {
    mockMatchMedia(true)
    const wrapper = mount(PhotoCommentsPanel, {
      attachTo: document.body,
      props: baseProps,
      global: { stubs: { MediaCarousel: true } },
    })
    await wrapper.vm.$nextTick()

    expect(wrapper.get('[aria-controls="photo-comments-panel"]').text()).toContain('View comments')
    expect(wrapper.get('[aria-controls="photo-comments-panel"]').attributes('aria-expanded')).toBe('false')
    expect(wrapper.get('#photo-comments-panel').isVisible()).toBe(false)
    expect(document.body.style.position).toBe('')

    await wrapper.get('[aria-controls="photo-comments-panel"]').trigger('click')
    expect(wrapper.emitted('update:open')).toEqual([[true]])
    wrapper.unmount()
  })

  it('locks the document, exposes modal semantics, and restores styles when closed', async () => {
    mockMatchMedia(true)
    const wrapper = mount(PhotoCommentsPanel, {
      attachTo: document.body,
      props: { ...baseProps, open: true, replyCount: 3 },
      global: { stubs: { MediaCarousel: true } },
    })
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    const panel = wrapper.get('#photo-comments-panel')
    expect(panel.attributes('role')).toBe('dialog')
    expect(panel.attributes('aria-modal')).toBe('true')
    expect(panel.text()).toContain('3 replies')
    expect(document.documentElement.style.overflow).toBe('hidden')
    expect(document.body.style.position).toBe('fixed')
    expect(document.body.style.top).toBe('-240px')

    await wrapper.setProps({ open: false })
    expect(document.documentElement.style.overflow).toBe('')
    expect(document.body.style.position).toBe('')
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 240 })
    wrapper.unmount()
  })

  it('cleans up the scroll lock if navigation unmounts an open sheet', async () => {
    mockMatchMedia(true)
    const wrapper = mount(PhotoCommentsPanel, {
      attachTo: document.body,
      props: { ...baseProps, open: true },
      global: { stubs: { MediaCarousel: true } },
    })
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()
    expect(document.body.style.position).toBe('fixed')

    wrapper.unmount()
    expect(document.documentElement.style.overflow).toBe('')
    expect(document.body.style.position).toBe('')
    expect(history.state.photoCommentsSheet).toBeUndefined()
  })

  it('closes on Escape and keeps button focus inside the modal', async () => {
    mockMatchMedia(true)
    const wrapper = mount(PhotoCommentsPanel, {
      attachTo: document.body,
      props: { ...baseProps, open: true },
      global: { stubs: { MediaCarousel: true } },
    })
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Close comments')

    await wrapper.get('#photo-comments-panel').trigger('keydown', { key: 'Escape' })
    window.dispatchEvent(new PopStateEvent('popstate'))
    expect(wrapper.emitted('update:open')).toEqual([[false]])
    wrapper.unmount()
  })

  it('reuses a sheet history entry after a page reload', async () => {
    mockMatchMedia(true)
    history.replaceState({ photoCommentsSheet: true }, '', '/photos/photo-1')
    const back = vi.spyOn(history, 'back').mockImplementation(() => {})
    const wrapper = mount(PhotoCommentsPanel, {
      attachTo: document.body,
      props: { ...baseProps, open: true },
      global: { stubs: { MediaCarousel: true } },
    })
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    await wrapper.get('[aria-label="Close comments"]').trigger('click')
    expect(back).toHaveBeenCalledOnce()
    wrapper.unmount()
  })

  it('renders as a non-modal single-scroll region on a sufficiently large desktop', async () => {
    mockMatchMedia(false)
    const wrapper = mount(PhotoCommentsPanel, {
      attachTo: document.body,
      props: baseProps,
      global: { stubs: { MediaCarousel: true } },
    })
    await wrapper.vm.$nextTick()

    const panel = wrapper.get('#photo-comments-panel')
    expect(panel.isVisible()).toBe(true)
    expect(panel.attributes('role')).toBe('region')
    expect(panel.attributes('aria-modal')).toBeUndefined()
    expect(document.body.style.position).toBe('')
    expect(wrapper.find('.comments-post-text').attributes('style')).toBeUndefined()
    wrapper.unmount()
  })

  it('renders explicit loading, unavailable, cached, truncated, and unsyndicated states', async () => {
    mockMatchMedia(false)
    const wrapper = mount(PhotoCommentsPanel, {
      props: { ...baseProps, discussionState: 'loading' },
      global: { stubs: { MediaCarousel: true } },
    })
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Loading replies…')

    await wrapper.setProps({ discussionState: 'unavailable', stale: true, truncated: true })
    expect(wrapper.text()).toContain('Replies are temporarily unavailable.')
    expect(wrapper.text()).toContain('Showing cached replies')
    expect(wrapper.text()).toContain('more replies than can be shown')

    await wrapper.setProps({ discussionState: 'not_syndicated', stale: false, truncated: false })
    expect(wrapper.text()).toContain('No Mastodon discussion is connected yet.')
    wrapper.unmount()
  })

  it('keeps short context inline and exercises deep, warned, media-bearing replies', async () => {
    mockMatchMedia(false)
    const comment = {
      ...post,
      content: '<p>A reply with an attachment.</p>',
      depth: 12,
      id: 'reply-1',
      media_attachments: [{
        description: 'Reply image',
        preview_url: '/reply-preview.jpg',
        type: 'image' as const,
        url: '/reply.jpg',
      }],
      replies: [],
      sensitive: true,
      spoiler_text: 'Content warning',
      url: 'https://social.example/@photographer/reply-1',
    }
    const wrapper = mount(PhotoCommentsPanel, {
      props: {
        ...baseProps,
        comments: [comment],
        remoteUrl: 'https://social.example/@photographer/photo-1',
        replyCount: 1,
      },
      global: { stubs: { MediaCarousel: true } },
    })
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.comments-context').element.tagName).toBe('SECTION')
    expect(wrapper.get('.comment-item').attributes('style')).toContain('--reply-depth: 6')
    expect(wrapper.text()).toContain('Content warning')
    expect(wrapper.findComponent({ name: 'MediaCarousel' }).exists()).toBe(true)
    expect(wrapper.get('.mastodon-reply-link').attributes('href')).toBe(comment.url.replace('/reply-1', '/photo-1'))
    wrapper.unmount()
  })

  it('uses a disclosure for long post context without adding another scroll container', async () => {
    mockMatchMedia(false)
    const wrapper = mount(PhotoCommentsPanel, {
      props: {
        ...baseProps,
        post: { ...post, content: `<p>${'Long context '.repeat(40)}</p>` },
      },
      global: { stubs: { MediaCarousel: true } },
    })
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.comments-context').element.tagName).toBe('DETAILS')
    expect(wrapper.get('.comments-context > summary').text()).toBe('About this photo')
    expect(wrapper.get('.comments-post-text').attributes('style')).toBeUndefined()
    wrapper.unmount()
  })
})
