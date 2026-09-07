import type { CanonicalPost } from './types'

export function canonicalPostPath(post: Pick<CanonicalPost, 'canonicalUrl'>): string {
  return post.canonicalUrl
}

export function postPath(post: Pick<CanonicalPost, 'shareUrl'>): string {
  return post.shareUrl
}
