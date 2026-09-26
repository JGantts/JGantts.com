import { formatEditorialDateTime } from './editorial-date-time'
import { canonicalPostPath, postPath } from './post-url'
import type { CanonicalPost, PostPreviewMeta } from './types'

// Older API responses can still be displayed during a rolling deployment.
function fallbackPreview(post: CanonicalPost): PostPreviewMeta {
  const hero = post.media.find((item) => item.id === post.heroMediaId) ?? post.media[0]
  const rendition = [...(hero?.renditions ?? [])]
    .filter((item) => item.format === 'jpeg' || item.format === 'png')
    .sort((left, right) => right.width - left.width)[0]
  const firstLine = (text: string | null) => text?.split(/\r?\n/, 1)[0]?.trim() || ''
  return {
    title: post.title?.trim() || 'Post by Jacob Gantt',
    description: [firstLine(post.title), firstLine(post.bodyMarkdown), firstLine(post.location),
      formatEditorialDateTime(post.date, post.time)].filter(Boolean).join('\n')
      || 'A post from Jacob Gantt on JGantts.com.',
    cardType: hero ? 'summary_large_image' : 'summary',
    image: hero ? {
      alt: hero.altText || post.title?.trim() || 'Post photo',
      url: rendition?.url ?? hero.urls.original,
      mimeType: rendition ? `image/${rendition.format}` : hero.mimeType,
      width: rendition?.width ?? hero.width ?? 0,
      height: rendition?.height ?? hero.height ?? 0,
    } : null,
  }
}

export function updatePostDocumentMeta(post: CanonicalPost): void {
  const preview = post.previewMeta ?? fallbackPreview(post)
  const origin = window.location.origin
  const canonicalUrl = new URL(canonicalPostPath(post), origin).toString()
  const image = preview.image ?? {
    url: '/social-media.png', mimeType: 'image/png', width: 1200, height: 630,
    alt: "A collage of Jacob Gantt's published photographs: Appalachian mountains, a swinging bridge, a flower, powerlines at sunset, and floral shadows.",
  }
  const imageUrl = new URL(image.url, origin).toString()
  const setMeta = (attribute: 'name' | 'property', key: string, content: string) => {
    let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`)
    if (!element) {
      element = document.createElement('meta')
      element.setAttribute(attribute, key)
      document.head.appendChild(element)
    }
    element.content = content
  }
  document.title = `${preview.title} | JGantts`
  setMeta('name', 'description', preview.description)
  setMeta('name', 'robots', 'index, follow')
  setMeta('property', 'og:type', 'article')
  setMeta('property', 'og:title', preview.title)
  setMeta('property', 'og:description', preview.description)
  setMeta('property', 'og:url', new URL(postPath(post), origin).toString())
  setMeta('property', 'og:image', imageUrl)
  setMeta('property', 'og:image:secure_url', imageUrl)
  setMeta('property', 'og:image:type', image.mimeType)
  setMeta('property', 'og:image:width', String(image.width))
  setMeta('property', 'og:image:height', String(image.height))
  setMeta('property', 'og:image:alt', image.alt)
  setMeta('property', 'article:published_time', post.publishedAt)
  setMeta('property', 'article:modified_time', post.updatedAt)
  setMeta('name', 'twitter:card', preview.cardType)
  setMeta('name', 'twitter:title', preview.title)
  setMeta('name', 'twitter:description', preview.description)
  setMeta('name', 'twitter:image', imageUrl)
  setMeta('name', 'twitter:image:alt', image.alt)
  let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!canonical) {
    canonical = document.createElement('link')
    canonical.rel = 'canonical'
    document.head.appendChild(canonical)
  }
  canonical.href = canonicalUrl
  document.querySelector('#__POST_JSON_LD__')?.remove()
  const jsonLd = document.createElement('script')
  jsonLd.id = '__POST_JSON_LD__'
  jsonLd.type = 'application/ld+json'
  jsonLd.textContent = JSON.stringify({
    '@context': 'https://schema.org', '@type': 'BlogPosting',
    headline: preview.title, description: preview.description,
    datePublished: post.publishedAt, dateModified: post.updatedAt,
    mainEntityOfPage: canonicalUrl,
    image: post.media.map((item) => new URL(item.urls.large, origin).toString()),
    author: { '@type': 'Person', name: 'Jacob Gantt', url: new URL('/', origin).toString() },
  }).replace(/</g, '\\u003c')
  document.head.appendChild(jsonLd)
}
