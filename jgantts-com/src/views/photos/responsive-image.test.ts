import { describe, expect, it } from 'vitest'
import type { PostMedia } from '@/posts/types'
import { responsiveImagePlan } from './responsive-image'

function media(): PostMedia {
  const widths = [320, 480, 768, 1024, 1600, 2400]
  return {
    altText: 'Test photo', byteSize: 1, caption: null, checksumSha256: 'x',
    createdAt: '', date: null, displayOrder: 0, focalX: null, focalY: null,
    height: 1500, id: 'photo', location: null, mimeType: 'image/jpeg',
    pipelineVersion: 1, placeholder: null, postId: 'post', processingState: 'ready', time: null,
    title: null, updatedAt: '', width: 3000,
    renditions: widths.flatMap((width) => [
      { byteSize: 1, colorSpace: 'srgb' as const, format: 'webp' as const,
        height: width / 2, privateMetadataStripped: true as const,
        purpose: 'responsive' as const, url: `/w-${width}`, variant: `w-${width}`, width },
      ...(width >= 768 ? [{ byteSize: 1, colorSpace: 'srgb' as const,
        format: 'avif' as const, height: width / 2, privateMetadataStripped: true as const,
        purpose: 'responsive' as const, url: `/avif-w-${width}`,
        variant: `avif-w-${width}`, width }] : []),
      { byteSize: 1, colorSpace: 'srgb' as const, format: 'jpeg' as const,
        height: width / 2, privateMetadataStripped: true as const,
        purpose: 'responsive' as const, url: `/jpeg-w-${width}`,
        variant: `jpeg-w-${width}`, width },
    ]),
    urls: { large: '/large', original: '/original', thumbnail: '/thumbnail' },
  }
}

describe('responsiveImagePlan', () => {
  it('bounds a tile to two device pixels per CSS pixel', () => {
    const plan = responsiveImagePlan({
      context: 'tile', devicePixelRatio: 3, displayWidth: 300, media: media(), saveData: false,
    })!
    expect(plan.targetWidth).toBe(600)
    expect(plan.webpSrcSet).toContain('/w-768 768w')
    expect(plan.webpSrcSet).not.toContain('/w-1024')
    expect(plan.avifSrcSet).toContain('/avif-w-768 768w')
  })

  it('omits AVIF when its smallest candidate greatly exceeds a small tile', () => {
    const plan = responsiveImagePlan({
      context: 'tile', devicePixelRatio: 2, displayWidth: 120, media: media(), saveData: false,
    })!
    expect(plan.targetWidth).toBe(240)
    expect(plan.avifSrcSet).toBe('')
    expect(plan.webpSrcSet).toBe('/w-320 320w')
  })

  it('uses one device pixel per CSS pixel with Save-Data', () => {
    const plan = responsiveImagePlan({
      context: 'lightbox', devicePixelRatio: 3, displayWidth: 700, media: media(), saveData: true,
    })!
    expect(plan.targetWidth).toBe(700)
    expect(plan.webpSrcSet).toContain('/w-768 768w')
    expect(plan.webpSrcSet).not.toContain('/w-1024')
  })

  it('uses PNG as the compatible fallback for transparent media', () => {
    const transparent = media()
    transparent.renditions = transparent.renditions.map((rendition) => rendition.format === 'jpeg'
      ? { ...rendition, format: 'png', url: rendition.url.replace('jpeg', 'png') }
      : rendition)
    const plan = responsiveImagePlan({
      context: 'tile', devicePixelRatio: 1, displayWidth: 400, media: transparent, saveData: false,
    })!
    expect(plan.fallbackSrc).toBe('/png-w-480')
    expect(plan.fallbackSrcSet).toContain('/png-w-320 320w')
  })

  it('preserves revisioned rendition URLs', () => {
    const revisioned = media()
    revisioned.renditions = revisioned.renditions.map((rendition) => ({
      ...rendition, url: `${rendition.url}?rev=3`,
    }))
    const plan = responsiveImagePlan({
      context: 'tile', devicePixelRatio: 1, displayWidth: 320, media: revisioned, saveData: false,
    })!
    expect(plan.webpSrcSet).toContain('/w-320?rev=3 320w')
  })

  it('falls back cleanly when a manifest has no usable renditions', () => {
    const malformed = media()
    malformed.renditions = malformed.renditions.map((rendition) => ({ ...rendition, width: 0 }))
    expect(responsiveImagePlan({
      context: 'tile', devicePixelRatio: 1, displayWidth: 320, media: malformed, saveData: false,
    })).toBeNull()
  })
})
