import type { PostMedia } from '@/posts/types'

export type ImageDisplayContext = 'lightbox' | 'tile'

type Rendition = PostMedia['renditions'][number]

export type ResponsiveImagePlan = {
  avifSrcSet: string
  fallbackSrc: string
  fallbackSrcSet: string
  sizes: string
  targetWidth: number
  webpSrcSet: string
}

function validRenditions(media: PostMedia): Rendition[] {
  const seen = new Set<string>()
  return media.renditions
    .filter((rendition) => {
      if (!rendition.url || rendition.width <= 0 || rendition.height <= 0) return false
      if (media.width && rendition.width > media.width) return false
      const key = `${rendition.format}:${rendition.width}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .sort((left, right) => left.width - right.width)
}

function boundedCandidates(candidates: Rendition[], targetWidth: number): Rendition[] {
  if (!candidates.length) return []
  const withinTarget = candidates.filter(({ width }) => width <= targetWidth)
  const firstAboveTarget = candidates.find(({ width }) => width > targetWidth)
  return firstAboveTarget ? [...withinTarget, firstAboveTarget] : withinTarget
}

function srcSet(candidates: Rendition[]): string {
  return candidates.map(({ url, width }) => `${url} ${width}w`).join(', ')
}

function candidateAtTarget(candidates: Rendition[], targetWidth: number): Rendition | undefined {
  return candidates.find(({ width }) => width >= targetWidth) ?? candidates.at(-1)
}

export function responsiveImagePlan(options: {
  context: ImageDisplayContext
  devicePixelRatio: number
  displayWidth: number
  media: PostMedia
  saveData: boolean
}): ResponsiveImagePlan | null {
  const { context, media } = options
  const displayWidth = Math.max(1, Math.ceil(options.displayWidth))
  const maximumDpr = context === 'lightbox' ? 2.5 : 2
  const effectiveDpr = options.saveData
    ? 1
    : Math.max(1, Math.min(options.devicePixelRatio || 1, maximumDpr))
  const targetWidth = Math.ceil(displayWidth * effectiveDpr)
  const renditions = validRenditions(media)
  if (!renditions.length) return null

  const webp = boundedCandidates(
    renditions.filter(({ format }) => format === 'webp'),
    targetWidth,
  )
  const avifCandidates = renditions.filter(({ format }) => format === 'avif')
  const avif = avifCandidates[0]?.width && avifCandidates[0].width <= targetWidth * 1.5
    ? boundedCandidates(avifCandidates, targetWidth)
    : []
  const compatible = renditions.filter(({ format }) => format === 'jpeg' || format === 'png')
  const fallbackCandidates = boundedCandidates(compatible.length ? compatible : webp, targetWidth)
  const fallback = candidateAtTarget(fallbackCandidates, targetWidth)
    ?? candidateAtTarget(renditions, targetWidth)
  if (!fallback) return null

  return {
    avifSrcSet: srcSet(avif),
    fallbackSrc: fallback.url,
    fallbackSrcSet: srcSet(fallbackCandidates),
    sizes: `${displayWidth}px`,
    targetWidth,
    webpSrcSet: srcSet(webp),
  }
}
