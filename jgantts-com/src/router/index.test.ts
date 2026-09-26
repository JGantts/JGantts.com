import { afterEach, expect, it, vi } from 'vitest'
import router from './index'
import { updatePostDocumentMeta } from '../posts/document-meta'
import type { CanonicalPost } from '../posts/types'

afterEach(() => { vi.unstubAllGlobals(); document.head.innerHTML = '' })

it('preserves server article metadata, refreshes it from API data, and clears it when leaving', async () => {
  vi.stubGlobal('scrollTo', vi.fn())
  document.head.innerHTML = '<title>Original article</title><link rel="canonical" href="http://localhost/photos/review?rev=4"><script id="__POST_JSON_LD__" type="application/ld+json">{}</script><meta property="og:type" content="article">'
  await router.push('/photos/review?rev=4&preview=abc123')
  expect(document.title).toBe('Original article')
  expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toContain('rev=4')
  expect(document.querySelector('#__POST_JSON_LD__')).not.toBeNull()
  const post: CanonicalPost = {
    id: 'review', slug: 'review', title: 'Different fallback', location: null, date: null, time: null,
    bodyMarkdown: '', bodyHtml: '', heroMediaId: null, media: [], publishedAt: '2026-09-01', updatedAt: '2026-09-26',
    canonicalUrl: '/photos/review?rev=5', shareUrl: '/photos/review?rev=5&preview=new', preview: 'new',
    previewMeta: {title:'API preview', description:'Exact server description', cardType:'summary_large_image',
      image:{url:'/media/collage.jpg',alt:'Collage',width:1200,height:630,mimeType:'image/jpeg'}},
  }
  updatePostDocumentMeta(post)
  expect(document.title).toBe('API preview | JGantts')
  expect(document.querySelector('meta[property="og:image"]')?.getAttribute('content')).toContain('/media/collage.jpg')
  expect(document.querySelector('meta[property="og:url"]')?.getAttribute('content')).toContain('rev=5&preview=new')
  expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toBe('Exact server description')
  expect(JSON.parse(document.querySelector('#__POST_JSON_LD__')!.textContent!).mainEntityOfPage).toContain('?rev=5')
  await router.push('/photos')
  expect(document.title).toBe('JGantts Photos')
  expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).not.toContain('?')
  expect(document.querySelector('#__POST_JSON_LD__')).toBeNull()
  expect(document.querySelector('meta[property="article:published_time"]')).toBeNull()
  expect(document.querySelector('meta[property="og:image:width"]')).toBeNull()
})
