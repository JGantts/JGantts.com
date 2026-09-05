export type PostMedia = {
  altText: string
  height: number | null
  id: string
  mimeType: string
  urls: {
    large: string
    original: string
    thumbnail: string
  }
  width: number | null
}

export type CanonicalPost = {
  bodyHtml: string
  contentWarning: string | null
  excerpt: string | null
  id: string
  media: PostMedia[]
  publishedAt: string
  slug: string
  title: string | null
  updatedAt: string
}

export type PostPage = {
  items: CanonicalPost[]
  nextCursor: string | null
}
