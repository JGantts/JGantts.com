import type { RouteLocationNormalized } from 'vue-router'

type AppRouteMeta = {
  title?: string
  description?: string
  socialTitle?: string
  socialDescription?: string
  socialImage?: string
  robots?: string
}

const defaultMeta: Required<AppRouteMeta> = {
  title: 'JGantts',
  description: 'JGantts',
  socialTitle: 'JGantts',
  socialDescription: 'JGantts',
  socialImage: '',
  robots: 'index, follow',
}

function upsertMetaTag(attribute: 'name' | 'property', key: string, content: string) {
  if (typeof document === 'undefined') {
    return
  }

  let tag = document.head.querySelector(`meta[${attribute}="${key}"]`)
  if (!tag) {
    tag = document.createElement('meta')
    tag.setAttribute(attribute, key)
    document.head.appendChild(tag)
  }

  tag.setAttribute('content', content)
}

function upsertCanonicalLink(href: string) {
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!link) {
    link = document.createElement('link')
    link.rel = 'canonical'
    document.head.appendChild(link)
  }
  link.href = href
}

function resolveMeta(to: RouteLocationNormalized): Required<AppRouteMeta> {
  const routeMeta = to.meta as AppRouteMeta
  const socialImage = routeMeta.socialImage
    ? new URL(routeMeta.socialImage, window.location.origin).toString()
    : ''

  return {
    title: routeMeta.title ?? defaultMeta.title,
    description: routeMeta.description ?? defaultMeta.description,
    socialTitle: routeMeta.socialTitle ?? routeMeta.title ?? defaultMeta.socialTitle,
    socialDescription:
      routeMeta.socialDescription ?? routeMeta.description ?? defaultMeta.socialDescription,
    socialImage,
    robots: routeMeta.robots ?? defaultMeta.robots,
  }
}

export function applyRouteDocumentMeta(to: RouteLocationNormalized) {
  if (typeof document === 'undefined') {
    return
  }

  const meta = resolveMeta(to)

  document.head.querySelectorAll('meta[property^="og:image:"], meta[name="twitter:image:alt"]').forEach((tag) => tag.remove())
  document.title = meta.title
  upsertMetaTag('name', 'description', meta.description)
  upsertMetaTag('property', 'og:title', meta.socialTitle)
  upsertMetaTag('property', 'og:description', meta.socialDescription)
  upsertMetaTag('property', 'og:image', meta.socialImage)
  upsertMetaTag('property', 'og:url', window.location.href)
  upsertMetaTag('property', 'og:type', 'website')
  upsertMetaTag('name', 'twitter:card', meta.socialImage ? 'summary_large_image' : 'summary')
  upsertMetaTag('name', 'twitter:title', meta.socialTitle)
  upsertMetaTag('name', 'twitter:description', meta.socialDescription)
  upsertMetaTag('name', 'twitter:image', meta.socialImage)
  upsertMetaTag('name', 'robots', meta.robots)
  upsertCanonicalLink(new URL(to.path, window.location.origin).toString())
  document.head.querySelectorAll('meta[property^="article:"]').forEach((tag) => tag.remove())
  document.head.querySelector('#__POST_JSON_LD__')?.remove()
}
