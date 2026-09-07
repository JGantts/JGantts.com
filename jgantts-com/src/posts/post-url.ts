import type { CanonicalPost } from './types'

export function postPath(post: Pick<CanonicalPost, 'build' | 'revision' | 'slug'>): string {
  const query = new URLSearchParams()
  if (post.revision) query.set('rev', String(post.revision))
  if (post.build) query.set('build', post.build)
  const suffix = query.toString()
  return `/photos/${encodeURIComponent(post.slug)}${suffix ? `?${suffix}` : ''}`
}
