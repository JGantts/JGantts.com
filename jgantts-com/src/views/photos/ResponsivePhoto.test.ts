import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { rgbaToThumbHash } from 'thumbhash'
import type { PostMedia } from '@/posts/types'
import ResponsivePhoto from './ResponsivePhoto.vue'

const testThumbhash = btoa(String.fromCharCode(...rgbaToThumbHash(1, 1, [136, 68, 34, 255])))

function localMedia(): PostMedia {
  return {
    altText: 'A sunset',
    byteSize: 1,
    caption: null,
    checksumSha256: 'test',
    createdAt: '',
    date: null,
    displayOrder: 0,
    focalX: 0.25,
    focalY: 0.75,
    height: 800,
    id: 'photo',
    location: null,
    mimeType: 'image/jpeg',
    pipelineVersion: 2,
    placeholder: {
      byteSize: 100,
      colorSpace: 'srgb',
      format: 'webp',
      height: 21,
      privateMetadataStripped: true,
      purpose: 'placeholder',
      url: '/placeholder.webp',
      variant: 'placeholder',
      width: 32,
    },
    postId: 'post',
    processingState: 'ready',
    renditions: [{
      byteSize: 1,
      colorSpace: 'srgb',
      format: 'webp',
      height: 800,
      privateMetadataStripped: true,
      purpose: 'responsive',
      url: '/photo.webp',
      variant: 'w-1200',
      width: 1200,
    }],
    time: null,
    thumbhash: testThumbhash,
    title: null,
    updatedAt: '',
    urls: { large: '/large', original: '/original', thumbnail: '/thumbnail' },
    width: 1200,
  }
}

function attachment() {
  const media = localMedia()
  return {
    description: media.altText,
    localMedia: media,
    preview_url: media.urls.thumbnail,
    type: 'image' as const,
    url: media.urls.large,
  }
}

describe('ResponsivePhoto placeholders', () => {
  it('decodes the inline ThumbHash with the same crop and focal point as a tile', () => {
    const wrapper = mount(ResponsivePhoto, {
      props: {
        alt: 'A sunset',
        attachment: attachment(),
        context: 'tile',
        displayWidth: 300,
      },
    })

    const style = wrapper.get('.responsive-photo').attributes('style')
    expect(style).toContain('background-image: url("data:image/png;base64,')
    expect(style).not.toContain('/placeholder.webp')
    expect(style).toContain('background-position: 25% 75%')
    expect(style).toContain('background-size: cover')
    wrapper.unmount()
  })

  it('falls back to the tiny WebP when a legacy photo has no ThumbHash', () => {
    const legacyAttachment = attachment()
    legacyAttachment.localMedia.thumbhash = null
    const wrapper = mount(ResponsivePhoto, {
      props: {
        alt: 'A sunset',
        attachment: legacyAttachment,
        context: 'tile',
        displayWidth: 300,
      },
    })

    expect(wrapper.get('.responsive-photo').attributes('style'))
      .toContain('background-image: url("/placeholder.webp")')
    wrapper.unmount()
  })

  it('prefers an already-loaded preview in the lightbox and fades in the full image', async () => {
    const wrapper = mount(ResponsivePhoto, {
      props: {
        alt: 'A sunset',
        attachment: attachment(),
        context: 'lightbox',
        displayWidth: 900,
        fit: 'contain',
        previewUrl: '/loaded-tile.webp',
      },
    })

    const photo = wrapper.get('.responsive-photo')
    expect(photo.attributes('style')).toContain('background-image: url("/loaded-tile.webp")')
    expect(photo.attributes('style')).toContain('background-size: contain')
    expect(photo.classes()).not.toContain('is-loaded')

    await wrapper.get('img').trigger('load')
    expect(photo.classes()).toContain('is-loaded')
    wrapper.unmount()
  })

  it('keeps off-screen photos low priority until they enter the viewport', async () => {
    let notify: IntersectionObserverCallback = () => undefined
    const disconnect = vi.fn()
    const observe = vi.fn()
    const OriginalIntersectionObserver = globalThis.IntersectionObserver
    globalThis.IntersectionObserver = class {
      readonly root = null
      readonly rootMargin = '0px'
      readonly scrollMargin = '0px'
      readonly thresholds = [0.01]

      constructor(callback: IntersectionObserverCallback) {
        notify = callback
      }

      disconnect = disconnect
      observe = observe
      takeRecords = () => []
      unobserve = () => undefined
    } as unknown as typeof IntersectionObserver

    try {
      const wrapper = mount(ResponsivePhoto, {
        props: {
          alt: 'A sunset',
          attachment: attachment(),
          context: 'tile',
          displayWidth: 300,
        },
      })

      expect(observe).toHaveBeenCalledOnce()
      expect(wrapper.get('img').attributes('loading')).toBe('lazy')
      expect(wrapper.get('img').attributes('fetchpriority')).toBe('low')

      notify([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver)
      await wrapper.vm.$nextTick()

      expect(wrapper.get('img').attributes('loading')).toBe('eager')
      expect(wrapper.get('img').attributes('fetchpriority')).toBe('high')
      expect(disconnect).toHaveBeenCalledOnce()
      wrapper.unmount()
    } finally {
      globalThis.IntersectionObserver = OriginalIntersectionObserver
    }
  })
})
