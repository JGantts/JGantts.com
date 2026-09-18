import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import type { PostMedia } from '@/posts/types'
import ResponsivePhoto from './ResponsivePhoto.vue'

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
    pipelineVersion: 1,
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
  it('uses the tiny local placeholder with the same crop and focal point as a tile', () => {
    const wrapper = mount(ResponsivePhoto, {
      props: {
        alt: 'A sunset',
        attachment: attachment(),
        context: 'tile',
        displayWidth: 300,
      },
    })

    const style = wrapper.get('.responsive-photo').attributes('style')
    expect(style).toContain('background-image: url("/placeholder.webp")')
    expect(style).toContain('background-position: 25% 75%')
    expect(style).toContain('background-size: cover')
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
})
